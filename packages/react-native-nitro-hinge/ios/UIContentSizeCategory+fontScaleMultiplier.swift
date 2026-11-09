import UIKit

extension UIContentSizeCategory {
  /// Approximate multiplier from Dynamic Type category to the
  /// fontScale value React Native's <Text> applies.
  ///
  /// These values match Apple's HIG default text size scaling
  /// for body copy. Real apps should let RN apply this automatically
  /// via allowFontScaling; this value is exposed only for
  /// consumers who want to key layout off it.
  var fontScaleMultiplier: Double {
    switch self {
    case .extraSmall: return 0.82
    case .small: return 0.88
    case .medium: return 0.94
    case .large: return 1.0
    case .extraLarge: return 1.12
    case .extraExtraLarge: return 1.24
    case .extraExtraExtraLarge: return 1.35
    case .accessibilityMedium: return 1.65
    case .accessibilityLarge: return 1.94
    case .accessibilityExtraLarge: return 2.35
    case .accessibilityExtraExtraLarge: return 2.76
    case .accessibilityExtraExtraExtraLarge: return 3.12
    default: return 1.0
    }
  }
}