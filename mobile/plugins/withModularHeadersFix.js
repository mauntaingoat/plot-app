/**
 * Expo config plugin: patches the generated Podfile so that pods which
 * are built as frameworks (because we set `useFrameworks: "static"` for
 * @react-native-firebase) are allowed to import React-Core headers
 * non-modularly. This is required by @react-native-firebase v22+ —
 * their Obj-C headers import `<React/RCTConvert.h>` etc. which the
 * compiler otherwise rejects under `-Wnon-modular-include-in-framework-module`.
 *
 * The fix injects `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
 * on every target inside the Podfile's `post_install` hook.
 *
 * Reference: https://github.com/invertase/react-native-firebase/issues/8043
 */
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const PATCH = `
    # Allow non-modular header includes in framework modules. Required
    # by @react-native-firebase when use_frameworks!:linkage=>:static is
    # set — their headers import React-Core non-modularly.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`

const withModularHeadersFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
      let contents = fs.readFileSync(podfilePath, 'utf8')

      // Inject just before the final `end` of `post_install do |installer|`.
      // Expo generates a post_install hook containing
      // `react_native_post_install(...)` — we tack our patch onto the end
      // of that block.
      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          /(post_install do \|installer\|[\s\S]*?)(\n  end\n)/,
          `$1${PATCH}$2`,
        )
        fs.writeFileSync(podfilePath, contents, 'utf8')
      }

      return config
    },
  ])
}

module.exports = withModularHeadersFix
