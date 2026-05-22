/**
 * Expo config plugin: patches the generated Podfile so
 * `@react-native-firebase/*` modules can compile under
 * `use_frameworks!:linkage=>:static`.
 *
 * Two patches:
 *
 *  1. `use_modular_headers!` injected at the top of the `target` block.
 *     Required by `@react-native-firebase/firestore` — its Obj-C
 *     headers use `<RCTBridgeModule>` from React-Core, but under static
 *     frameworks Clang can only resolve that via the module system.
 *
 *  2. `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
 *     in `post_install` for every target. Catches residual non-modular
 *     `#import <React/...>` cases that `@react-native-firebase/app`
 *     ships and that `use_modular_headers!` alone doesn't silence.
 */
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const POST_INSTALL_PATCH = `
    # Allow non-modular header includes in framework modules. Required
    # by @react-native-firebase when use_frameworks!:linkage=>:static is
    # set — their headers import React-Core non-modularly.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`

const MODULAR_HEADERS_LINE = '  use_modular_headers!\n'

const withModularHeadersFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
      let contents = fs.readFileSync(podfilePath, 'utf8')

      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          /(target '[^']+' do\n)/,
          `$1${MODULAR_HEADERS_LINE}`,
        )
      }

      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          /(post_install do \|installer\|[\s\S]*?)(\n  end\n)/,
          `$1${POST_INSTALL_PATCH}$2`,
        )
      }

      fs.writeFileSync(podfilePath, contents, 'utf8')
      return config
    },
  ])
}

module.exports = withModularHeadersFix
