import Combine
import Foundation

final class FloatingBarViewModel: ObservableObject {
  @Published var dictation: FloatingDictationPayload?
  @Published var amplitude: Double = 0
  // Personal fork (FORK.md, "Live waveform"): recent loudness readings,
  // oldest first, so the bars show real audio instead of a fixed animation.
  @Published var levels: [Double] = Array(repeating: 0, count: 5)
  @Published var status: FloatingBarStatus = .recording
  @Published var colorScheme: FloatingBarColorScheme = .dark
  @Published var isExpanded: Bool = false
  @Published var liveCaptionToggleVisible: Bool = false
  @Published var title: String = "Live transcript"
  @Published var transcriptBubbles: [FloatingTranscriptBubblePayload] = []
  @Published var transcriptNotice: String?
  @Published var placement: FloatingControlPlacement.Layout?
}
