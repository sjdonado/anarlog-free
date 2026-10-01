//! Personal fork (FORK.md, "Microphone fallback with the lid closed").
//!
//! With the lid closed, Apple disconnects the built-in microphone in hardware,
//! yet Core Audio still lists it as a live input, so capture records silence.
//! When the requested (or default) input is that built-in mic, redirect to the
//! best real alternative. If upstream ever handles this, prefer its version and
//! delete this module.

use crate::{AudioDevice, TransportType};

/// Name of the input to open instead of `requested`, or `None` to keep it.
pub fn lid_closed_input_override(requested: Option<&str>) -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        use crate::AudioDeviceBackend;

        if !is_lid_closed() {
            return None;
        }
        let inputs = crate::backend().list_input_devices().ok()?;
        let target = requested
            .filter(|name| !name.is_empty())
            .map(str::to_string)
            .or_else(crate::default_input_device_name)?;
        let choice = pick_lid_closed_input(&target, &inputs);
        if let Some(name) = &choice {
            tracing::info!(requested = %target, opened = %name, "lid_closed_mic_redirect");
        }
        choice
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = requested;
        None
    }
}

#[cfg(target_os = "macos")]
fn is_lid_closed() -> bool {
    std::process::Command::new("/usr/sbin/ioreg")
        .args(["-r", "-k", "AppleClamshellState", "-d", "1"])
        .output()
        .map(|out| String::from_utf8_lossy(&out.stdout).contains("\"AppleClamshellState\" = Yes"))
        .unwrap_or(false)
}

/// Bluetooth headsets first (AirPods), then Continuity (the iPhone microphone
/// reports an unknown transport), then wired hardware. Virtual devices are
/// never picked: they are usually silent unless their app is running.
fn rank(device: &AudioDevice) -> Option<u8> {
    match device.transport_type {
        TransportType::Bluetooth => Some(0),
        TransportType::Unknown => Some(1),
        TransportType::Usb => Some(2),
        TransportType::Hdmi | TransportType::Pci => Some(3),
        TransportType::BuiltIn | TransportType::Virtual => None,
    }
}

pub(crate) fn pick_lid_closed_input(target: &str, inputs: &[AudioDevice]) -> Option<String> {
    let requested = inputs.iter().find(|device| device.name == target);
    if requested.is_some_and(|device| device.transport_type != TransportType::BuiltIn) {
        return None;
    }
    inputs
        .iter()
        .filter_map(|device| rank(device).map(|score| (score, device)))
        .min_by_key(|(score, _)| *score)
        .map(|(_, device)| device.name.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AudioDirection;

    fn input(name: &str, transport: TransportType) -> AudioDevice {
        AudioDevice::new(name, name, AudioDirection::Input, transport)
    }

    fn devices() -> Vec<AudioDevice> {
        vec![
            input("iPhone Microphone", TransportType::Unknown),
            input("MacBook Pro Microphone", TransportType::BuiltIn),
            input("Teams Audio", TransportType::Virtual),
            input("AirPods Pro", TransportType::Bluetooth),
        ]
    }

    #[test]
    fn redirects_built_in_to_airpods_first() {
        assert_eq!(
            pick_lid_closed_input("MacBook Pro Microphone", &devices()).as_deref(),
            Some("AirPods Pro")
        );
    }

    #[test]
    fn falls_back_to_the_iphone_without_airpods() {
        let inputs: Vec<_> = devices()
            .into_iter()
            .filter(|device| device.name != "AirPods Pro")
            .collect();
        assert_eq!(
            pick_lid_closed_input("MacBook Pro Microphone", &inputs).as_deref(),
            Some("iPhone Microphone")
        );
    }

    #[test]
    fn keeps_a_requested_external_mic() {
        assert_eq!(pick_lid_closed_input("iPhone Microphone", &devices()), None);
    }

    #[test]
    fn replaces_a_requested_mic_that_is_gone() {
        assert_eq!(
            pick_lid_closed_input("USB Mic", &devices()).as_deref(),
            Some("AirPods Pro")
        );
    }

    #[test]
    fn never_picks_virtual_devices() {
        let inputs = vec![
            input("MacBook Pro Microphone", TransportType::BuiltIn),
            input("Teams Audio", TransportType::Virtual),
        ];
        assert_eq!(
            pick_lid_closed_input("MacBook Pro Microphone", &inputs),
            None
        );
    }
}
