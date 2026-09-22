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
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_OBJC_INTEROP_MODE" => "objcxx",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "CLANG_CXX_LIBRARY" => "libc++"
  }

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'

  load 'nitrogen/generated/ios/NitroHinge+autolinking.rb'
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
