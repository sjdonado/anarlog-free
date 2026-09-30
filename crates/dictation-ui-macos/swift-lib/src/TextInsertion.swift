import Carbon
import Cocoa
import SwiftRs

private final class DictationPasteProvider: NSObject, NSPasteboardItemDataProvider {
  let text: String
  var didRead: (() -> Void)?
  init(text: String) { self.text = text }
  func pasteboard(
    _ pasteboard: NSPasteboard?, item: NSPasteboardItem,
    provideDataForType type: NSPasteboard.PasteboardType
  ) {
    item.setString(text, forType: type)
    // Restore after the target has requested and received its owned text representation.
    DispatchQueue.main.async {
      self.didRead?()
      self.didRead = nil
    }
  }
}

private final class DictationTarget {
  static let shared = DictationTarget()
  var element: AXUIElement?
  // Personal fork: apps whose focused view is not an accessible text field
  // (terminals such as Ghostty) are targeted by process and receive a paste.
  var pastePid: pid_t?
  var token = ""
  var clipboardSnapshot: [NSPasteboardItem]?
  var clipboardChangeCount: Int?
  var clipboardProvider: DictationPasteProvider?

  func focusedElement() -> AXUIElement? {
    guard AXIsProcessTrusted() else { return nil }
    let system = AXUIElementCreateSystemWide()
    AXUIElementSetMessagingTimeout(system, 1)
    var value: CFTypeRef?
    guard
      AXUIElementCopyAttributeValue(system, kAXFocusedUIElementAttribute as CFString, &value)
        == .success,
      let value, CFGetTypeID(value) == AXUIElementGetTypeID()
    else { return nil }
    let element = unsafeBitCast(value, to: AXUIElement.self)
    AXUIElementSetMessagingTimeout(element, 1)
    return element
  }

  func isSecure(_ element: AXUIElement) -> Bool {
    var subrole: CFTypeRef?
    AXUIElementCopyAttributeValue(element, kAXSubroleAttribute as CFString, &subrole)
    return subrole as? String == kAXSecureTextFieldSubrole
  }

  func frontmostPasteTarget(_ focused: AXUIElement?) -> pid_t? {
    if let focused, isSecure(focused) { return nil }
    // Terminals turn on Secure Keyboard Entry for password prompts.
    if IsSecureEventInputEnabled() { return nil }
    // Like Handy (cjpais/handy), paste into whatever is frontmost, Anarlog
    // included: its webview handles Command-V like any other field.
    return NSWorkspace.shared.frontmostApplication?.processIdentifier
  }

  func acceptsText(_ element: AXUIElement) -> Bool {
    var role: CFTypeRef?
    var subrole: CFTypeRef?
    AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
    AXUIElementCopyAttributeValue(element, kAXSubroleAttribute as CFString, &subrole)
    if subrole as? String == kAXSecureTextFieldSubrole { return false }
    var editable = DarwinBoolean(false)
    AXUIElementIsAttributeSettable(element, kAXSelectedTextAttribute as CFString, &editable)
    if editable.boolValue { return true }
    AXUIElementIsAttributeSettable(element, kAXValueAttribute as CFString, &editable)
    return editable.boolValue
      && [kAXTextFieldRole, kAXTextAreaRole, kAXComboBoxRole].contains(role as? String ?? "")
  }

  func capture() -> String {
    element = nil
    pastePid = nil
    let focused = focusedElement()
    if let focused, acceptsText(focused) {
      element = focused
    } else if AXIsProcessTrusted(), let pid = frontmostPasteTarget(focused) {
      pastePid = pid
    } else {
      let front = NSWorkspace.shared.frontmostApplication
      NSLog(
        "anarlog-dictation capture refused: trusted=%d secureInput=%d focused=%d frontmost=%@ frontmostPid=%d ownPid=%d",
        AXIsProcessTrusted() ? 1 : 0, IsSecureEventInputEnabled() ? 1 : 0, focused == nil ? 0 : 1,
        front?.bundleIdentifier ?? "nil", front?.processIdentifier ?? -1,
        ProcessInfo.processInfo.processIdentifier)
      if IsSecureEventInputEnabled() {
        return
          "Secure Keyboard Entry is on, so dictation cannot type here. Turn it off in the focused app (for example after a password prompt) and try again."
      }
      return
        "Focus an editable text field and enable Anarlog in System Settings > Privacy & Security > Accessibility. Password fields are excluded."
    }
    token = UUID().uuidString
    return "ok:" + token
  }

  func insert(token: String, text: String) -> String {
    let changed =
      "The focused text field changed. Copy your last dictation from Settings > Dictation."
    guard token == self.token else { return changed }
    if let pid = pastePid {
      pastePid = nil
      guard NSWorkspace.shared.frontmostApplication?.processIdentifier == pid,
        frontmostPasteTarget(focusedElement()) == pid
      else { return changed }
      return paste(text)
    }
    guard let target = element, let focused = focusedElement(),
      CFEqual(target, focused), acceptsText(focused)
    else {
      return changed
    }
    element = nil

    // AXSelectedText replaces the selection or inserts at the caret without touching the clipboard.
    if AXUIElementSetAttributeValue(target, kAXSelectedTextAttribute as CFString, text as CFString)
      == .success
    {
      return ""
    }
    return paste(text)
  }

  private func paste(_ text: String) -> String {
    // Personal fork: a private source keeps held physical keys (for example Fn
    // pressed again for the next dictation) out of the synthetic chord, and an
    // explicit Command press makes apps that track modifier state (terminals)
    // see Command-V instead of a bare "v".
    guard let source = CGEventSource(stateID: .privateState),
      let commandDown = CGEvent(keyboardEventSource: source, virtualKey: 55, keyDown: true),
      let down = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: true),
      let up = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: false),
      let commandUp = CGEvent(keyboardEventSource: source, virtualKey: 55, keyDown: false)
    else { return "Could not insert text. Copy your last dictation from Settings > Dictation." }

    let pasteboard = NSPasteboard.general
    if clipboardChangeCount != pasteboard.changeCount {
      clipboardSnapshot = nil
    }
    var saved = clipboardSnapshot ?? []
    if clipboardSnapshot == nil {
      for original in pasteboard.pasteboardItems ?? [] {
        let copy = NSPasteboardItem()
        for type in original.types {
          guard let data = original.data(forType: type), copy.setData(data, forType: type) else {
            return
              "Could not preserve the clipboard. Copy your last dictation from Settings > Dictation."
          }
        }
        saved.append(copy)
      }
    }
    let item = NSPasteboardItem()
    let provider = DictationPasteProvider(text: text)
    item.setDataProvider(provider, forTypes: [.string])
    item.setString("", forType: NSPasteboard.PasteboardType("org.nspasteboard.ConcealedType"))
    item.setString("", forType: NSPasteboard.PasteboardType("org.nspasteboard.TransientType"))
    let clearedCount = pasteboard.clearContents()
    guard pasteboard.writeObjects([item]) else {
      clipboardSnapshot = saved
      clipboardChangeCount = clearedCount
      restoreClipboard(saved, expectedChangeCount: clearedCount, retries: 2)
      return "Could not prepare dictation for insertion."
    }
    let changeCount = pasteboard.changeCount
    clipboardSnapshot = saved
    clipboardChangeCount = changeCount
    clipboardProvider = provider
    provider.didRead = {
      self.restoreClipboard(saved, expectedChangeCount: changeCount, retries: 2)
    }
    // A destination may ignore Command-V and never request the promised text.
    DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
      self.restoreClipboard(saved, expectedChangeCount: changeCount, retries: 2)
    }
    commandDown.flags = .maskCommand
    down.flags = .maskCommand
    up.flags = .maskCommand
    commandUp.flags = []
    for event in [commandDown, down, up, commandUp] {
      // Lets Anarlog's own shortcut tap ignore this synthetic chord.
      event.setIntegerValueField(.eventSourceUserData, value: syntheticPasteMarker)
      event.post(tap: .cghidEventTap)
      usleep(8_000)
    }
    return ""
  }

  private func restoreClipboard(_ saved: [NSPasteboardItem], expectedChangeCount: Int, retries: Int)
  {
    guard clipboardChangeCount == expectedChangeCount else { return }
    let pasteboard = NSPasteboard.general
    if pasteboard.changeCount == expectedChangeCount {
      let count = pasteboard.clearContents()
      if !saved.isEmpty && !pasteboard.writeObjects(saved) {
        guard pasteboard.changeCount == count else {
          clipboardSnapshot = nil
          clipboardChangeCount = nil
          clipboardProvider = nil
          return
        }
        clipboardChangeCount = count
        if retries > 0 {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.restoreClipboard(saved, expectedChangeCount: count, retries: retries - 1)
          }
        } else {
          NSLog("Could not restore dictation clipboard; keeping its owned snapshot for recovery.")
        }
        return
      }
    }
    clipboardSnapshot = nil
    clipboardChangeCount = nil
    clipboardProvider = nil
  }

}

// Personal fork: matches SYNTHETIC_PASTE_MARKER in crates/shortcut-macos/src/tap.rs.
let syntheticPasteMarker: Int64 = 0x414E_4C47

// Personal fork: wait (off the main thread) until the user has let go of Fn and
// every other modifier, so the paste chord cannot mix with a held key.
private func waitForModifiersReleased(timeout: TimeInterval = 1.5) {
  let held: CGEventFlags = [
    .maskSecondaryFn, .maskCommand, .maskAlternate, .maskControl, .maskShift,
  ]
  let deadline = Date().addingTimeInterval(timeout)
  while !CGEventSource.flagsState(.hidSystemState).intersection(held).isEmpty,
    Date() < deadline
  {
    usleep(20_000)
  }
  // Settle after the release so the key-up is processed before the chord.
  usleep(30_000)
}

private func onMain<T>(_ work: () -> T) -> T {
  Thread.isMainThread ? work() : DispatchQueue.main.sync(execute: work)
}

@_cdecl("_capture_dictation_target")
public func captureDictationTarget() -> SRString {
  SRString(onMain { DictationTarget.shared.capture() })
}

@_cdecl("_insert_dictation_text")
public func insertDictationText(target: SRString, text: SRString) -> SRString {
  if !Thread.isMainThread { waitForModifiersReleased() }
  return SRString(
    onMain { DictationTarget.shared.insert(token: target.toString(), text: text.toString()) })
}
