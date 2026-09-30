mod batch;
pub mod error;
mod language;
mod live;

use crate::providers::Provider;
use owhisper_interface::ListenParams;
use serde::Deserialize;

use super::LanguageSupport;

#[derive(Clone, Default)]
pub struct ElevenLabsAdapter;

impl ElevenLabsAdapter {
    pub fn language_support_live(languages: &[anlg_language::Language]) -> LanguageSupport {
        LanguageSupport::min(languages.iter().map(language::single_language_support))
    }

    pub fn language_support_batch(languages: &[anlg_language::Language]) -> LanguageSupport {
        Self::language_support_live(languages)
    }

    pub fn is_supported_languages_live(languages: &[anlg_language::Language]) -> bool {
        Self::language_support_live(languages).is_supported()
    }

    pub fn is_supported_languages_batch(languages: &[anlg_language::Language]) -> bool {
        Self::language_support_batch(languages).is_supported()
    }

    pub(crate) fn build_ws_url_from_base(api_base: &str) -> (url::Url, Vec<(String, String)>) {
        super::build_ws_url_from_base_with(Provider::ElevenLabs, api_base, |parsed| {
            super::build_url_with_scheme(
                parsed,
                Provider::ElevenLabs.default_api_host(),
                Provider::ElevenLabs.ws_path(),
                true,
            )
        })
    }

    /// Keyterms bias Scribe toward names and domain terms (keyterm prompting).
    /// Enforces the API limits: at most 5 words, no `<>{}[]\`, call-site char
    /// cap (50 batch, 20 realtime), at most 50 unique terms. Character (not
    /// byte) counts match the documented limits; `split_whitespace` already
    /// collapses interior whitespace runs.
    pub(crate) fn keyterms(params: &ListenParams, max_chars: usize) -> Vec<String> {
        let mut seen = std::collections::HashSet::new();
        params
            .keywords
            .iter()
            .filter_map(|keyword| {
                let term = keyword
                    .split_whitespace()
                    .take(5)
                    .collect::<Vec<_>>()
                    .join(" ");
                let term: String = term
                    .chars()
                    .filter(|c| !matches!(c, '<' | '>' | '{' | '}' | '[' | ']' | '\\'))
                    .collect();
                let term = term.trim();
                if term.is_empty()
                    || term.chars().count() > max_chars
                    || !seen.insert(term.to_string())
                {
                    None
                } else {
                    Some(term.to_string())
                }
            })
            .take(50)
            .collect()
    }

    pub(crate) fn batch_api_url(api_base: &str) -> String {
        if api_base.is_empty() {
            return format!(
                "https://{}/v1/speech-to-text",
                Provider::ElevenLabs.default_api_host()
            );
        }

        let parsed: url::Url = api_base.parse().expect("invalid_api_base");
        super::build_url_with_scheme(
            &parsed,
            Provider::ElevenLabs.default_api_host(),
            "/v1/speech-to-text",
            false,
        )
        .to_string()
    }
}

#[derive(Debug, Deserialize)]
pub(crate) struct ElevenLabsWord {
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub start: f64,
    #[serde(default)]
    pub end: f64,
    #[serde(default, rename = "type")]
    pub word_type: Option<String>,
    #[serde(default)]
    pub speaker_id: Option<String>,
}

pub(super) fn documented_language_codes() -> Vec<&'static str> {
    let mut codes = Vec::new();
    codes.extend_from_slice(language::EXCELLENT_LANGS);
    codes.extend_from_slice(language::HIGH_LANGS);
    codes.extend_from_slice(language::GOOD_LANGS);
    codes.extend_from_slice(language::MODERATE_LANGS);
    codes.extend_from_slice(language::NO_DATA_LANGS);
    codes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_ws_url_from_base() {
        let cases = [
            (
                "",
                "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
                vec![],
            ),
            (
                "https://api.elevenlabs.io",
                "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
                vec![],
            ),
            (
                "https://api.anarlog.so?provider=elevenlabs",
                "wss://api.anarlog.so/listen",
                vec![("provider", "elevenlabs")],
            ),
            (
                "http://localhost:8787/listen?provider=elevenlabs",
                "ws://localhost:8787/listen",
                vec![("provider", "elevenlabs")],
            ),
        ];

        for (input, expected_url, expected_params) in cases {
            let (url, params) = ElevenLabsAdapter::build_ws_url_from_base(input);
            assert_eq!(url.as_str(), expected_url, "input: {}", input);
            assert_eq!(
                params,
                expected_params
                    .into_iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect::<Vec<_>>(),
                "input: {}",
                input
            );
        }
    }

    #[test]
    fn test_keyterms_enforce_api_limits() {
        let params = owhisper_interface::ListenParams {
            keywords: vec![
                "Ada".to_string(),
                "a b c d e f".to_string(),
                "with<bad>chars".to_string(),
                "   ".to_string(),
                "x".repeat(60),
            ],
            ..Default::default()
        };

        assert_eq!(
            ElevenLabsAdapter::keyterms(&params, 50),
            vec!["Ada", "a b c d e", "withbadchars"]
        );
        assert_eq!(ElevenLabsAdapter::keyterms(&params, 3), vec!["Ada"]);
    }

    #[test]
    fn test_is_host() {
        assert!(Provider::ElevenLabs.matches_url("https://api.elevenlabs.io"));
        assert!(Provider::ElevenLabs.matches_url("https://api.elevenlabs.io/v1"));
        assert!(!Provider::ElevenLabs.matches_url("https://api.deepgram.com"));
        assert!(!Provider::ElevenLabs.matches_url("https://api.assemblyai.com"));
    }

    #[test]
    fn test_batch_api_url() {
        for (input, expected) in [
            ("", "https://api.elevenlabs.io/v1/speech-to-text"),
            (
                "https://custom.elevenlabs.io",
                "https://custom.elevenlabs.io/v1/speech-to-text",
            ),
        ] {
            assert_eq!(
                ElevenLabsAdapter::batch_api_url(input),
                expected,
                "input: {input}"
            );
        }
    }
}
