require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroHinge"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Gautham495/react-native-nitro-hinge.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{m,mm}",
    "cpp/**/*.{hpp,cpp}",
  ]

  # Required for Nitro's C++ ↔ Swift interop.
  # - DEFINES_MODULE: Xcode generates NitroHinge-Swift.h so C++ can see Swift classes
  # - SWIFT_OBJC_INTEROP_MODE = objcxx: enables the modern C++/Swift bridge
  # - CLANG_CXX_LANGUAGE_STANDARD = c++20: Nitro requires C++20
  # Without these, C++ code emits "Cannot find type 'HybridHinge' in scope".
  xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTEROP_MODE" => "objcxx",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "CLANG_CXX_LIBRARY" => "libc++"
  }

  # reservedRegions(kind:) and UIHingeInteraction ship in the iOS 27.1 SDK.
  # The fold code compiles only when the active Xcode has that SDK.
  # Set HINGE_IOS_27_1_SDK=1 or 0 (true/false, yes/no, on/off) before pod
  # install to override; any other value falls back to the check.
  hinge_sdk = ENV["HINGE_IOS_27_1_SDK"].to_s.strip.downcase
  hinge_enabled =
    if %w[1 true yes on].include?(hinge_sdk)
      true
    elsif %w[0 false no off].include?(hinge_sdk)
      false
    else
      sdk_version = (`xcrun --sdk iphoneos --show-sdk-version 2>/dev/null`.strip rescue "")
      Gem::Version.correct?(sdk_version) && Gem::Version.new(sdk_version) >= Gem::Version.new("27.1")
    end
  if hinge_enabled
    xcconfig["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "$(inherited) HINGE_IOS_27_1_SDK"
  end

  s.pod_target_xcconfig = xcconfig

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'

  load 'nitrogen/generated/ios/NitroHinge+autolinking.rb'
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
