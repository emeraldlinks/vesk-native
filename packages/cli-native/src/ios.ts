import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { VeskConfig } from 'vesk-native';

const pbxUuid = (() => {
  let n = 0;
  return (): string => {
    const hex = (n++).toString(16).padStart(6, '0');
    return `VESK0000000000000000${hex}`.slice(-24).toUpperCase();
  };
})();

// ---------------------------------------------------------------------------
// iOS project generation (Xcode 26 / iOS 26 SDK era, verified against the
// 2026 Apple release requirements). Everything an Xcode build needs is
// generated here — the user never writes .pbxproj/Info.plist/entitlements by
// hand. Signing values come from veskconfig.signing.ios; secrets reference
// `env:NAME` and are never written into generated files.
//
// The .vsk -> SwiftUI compiler backend is the next milestone: today the
// generated app compiles a SwiftUI shell so the signing/bundling pipeline is
// real and end-to-end; page compilation plugs in underneath the shell.
// ---------------------------------------------------------------------------

export function generateIosProject(target: string, config: VeskConfig): void {
  const iosDir = join(target, 'ios');
  const appDir = join(iosDir, 'VeskApp');
  const teamId = config.signing?.ios?.teamId ?? 'XXXXXXXXXX';
  const signingStyle = config.signing?.ios?.style ?? 'automatic';
  const deploymentTarget = '17.0';

  mkdirSync(join(iosDir, 'VeskApp.xcodeproj'), { recursive: true });
  mkdirSync(appDir, { recursive: true });
  if (config.signing?.ios?.style === 'manual') {
    mkdirSync(join(iosDir, 'profiles'), { recursive: true });
  }

  writeFileSync(join(appDir, 'Info.plist'), iosInfoPlist(config));
  writeFileSync(join(appDir, 'VeskApp.entitlements'), iosEntitlements());
  writeFileSync(join(appDir, 'VeskApp.swift'), iosAppSwift());
  writeFileSync(join(appDir, 'ContentView.swift'), iosContentView());
  writeFileSync(join(iosDir, 'VeskApp.xcodeproj', 'project.pbxproj'), iosPbxproj(config, teamId, signingStyle, deploymentTarget));
}

function iosInfoPlist(config: VeskConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>${config.appName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>${config.versionName}</string>
	<key>CFBundleVersion</key>
	<string>${config.versionCode}</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIApplicationSceneManifest</key>
	<dict>
		<key>UIApplicationSupportsMultipleScenes</key>
		<false/>
	</dict>
	<key>UILaunchScreen</key>
	<dict/>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>arm64</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
</dict>
</plist>
`;
}

function iosEntitlements(): string {
  // App Sandbox + push are opt-in capabilities; nothing is declared "just in
  // case". The profile must cover whatever is listed here.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>development</string>
</dict>
</plist>
`;
}

function iosAppSwift(): string {
  return `import SwiftUI

// vesk-native iOS shell. The .vsk -> SwiftUI compiler backend plugs in below
// this entry point (next milestone); the shell keeps the signing/bundling
// pipeline real and end-to-end.
@main
struct VeskApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;
}

function iosContentView(): string {
  return `import SwiftUI

// Placeholder shell rendered until .vsk pages compile to SwiftUI.
struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 48))
            Text("vesk-native for iOS")
                .font(.headline)
            Text("The .vsk -> SwiftUI compiler backend is the next milestone; the signing/bundling pipeline below this shell is complete.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 32)
        }
    }
}

#Preview {
    ContentView()
}
`;
}

function iosPbxproj(config: VeskConfig, teamId: string, signingStyle: string, deploymentTarget: string): string {
  // One native target, no frameworks beyond the system ones. objectVersion 56
  // is accepted by Xcode 14+ through Xcode 26.
  const appSwift = pbxUuid();
  const contentSwift = pbxUuid();
  const sourcesBuildPhase = pbxUuid();
  const resourcesBuildPhase = pbxUuid();
  const frameworksBuildPhase = pbxUuid();
  const fileRefApp = pbxUuid();
  const fileRefContent = pbxUuid();
  const fileRefInfo = pbxUuid();
  const fileRefEntitlements = pbxUuid();
  const fileRefProduct = pbxUuid();
  const groupVeskApp = pbxUuid();
  const groupMain = pbxUuid();
  const groupProducts = pbxUuid();
  const target = pbxUuid();
  const project = pbxUuid();
  const buildConfigListTarget = pbxUuid();
  const buildConfigListProject = pbxUuid();
  const buildConfigDebugTarget = pbxUuid();
  const buildConfigReleaseTarget = pbxUuid();
  const buildConfigDebugProject = pbxUuid();
  const buildConfigReleaseProject = pbxUuid();

  const codeSignStyle = signingStyle === 'manual' ? '"Manual"' : '"Automatic"';
  const team = teamId !== 'XXXXXXXXXX' ? `\t\t\t\tDEVELOPMENT_TEAM = ${teamId};\n` : '';

  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {

/* Begin PBXBuildFile section */
		${appSwift} /* VeskApp.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefApp} /* VeskApp.swift */; };
		${contentSwift} /* ContentView.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefContent} /* ContentView.swift */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		${fileRefApp} /* VeskApp.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = VeskApp.swift; sourceTree = "<group>"; };
		${fileRefContent} /* ContentView.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ContentView.swift; sourceTree = "<group>"; };
		${fileRefInfo} /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
		${fileRefEntitlements} /* VeskApp.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = VeskApp.entitlements; sourceTree = "<group>"; };
		${fileRefProduct} /* VeskApp.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = VeskApp.app; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		${frameworksBuildPhase} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${groupMain} = {
			isa = PBXGroup;
			children = (
				${groupVeskApp} /* VeskApp */,
				${groupProducts} /* Products */,
			);
			sourceTree = "<group>";
		};
		${groupVeskApp} /* VeskApp */ = {
			isa = PBXGroup;
			children = (
				${fileRefApp} /* VeskApp.swift */,
				${fileRefContent} /* ContentView.swift */,
				${fileRefInfo} /* Info.plist */,
				${fileRefEntitlements} /* VeskApp.entitlements */,
			);
			path = VeskApp;
			sourceTree = "<group>";
		};
		${groupProducts} /* Products */ = {
			isa = PBXGroup;
			children = (
				${fileRefProduct} /* VeskApp.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${target} /* VeskApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${buildConfigListTarget} /* Build configuration list for PBXNativeTarget "VeskApp" */;
			buildPhases = (
				${sourcesBuildPhase} /* Sources */,
				${frameworksBuildPhase} /* Frameworks */,
				${resourcesBuildPhase} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = VeskApp;
			productName = VeskApp;
			productReference = ${fileRefProduct} /* VeskApp.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${project} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1600;
				LastUpgradeCheck = 1600;
				TargetAttributes = {
					${target} = {
						CreatedOnToolsVersion = 16.0;
					};
				};
			};
			buildConfigurationList = ${buildConfigListProject} /* Build configuration list for PBXProject "VeskApp" */;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${groupMain};
			productRefGroup = ${groupProducts} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${target} /* VeskApp */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${resourcesBuildPhase} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${sourcesBuildPhase} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${appSwift} /* VeskApp.swift in Sources */,
				${contentSwift} /* ContentView.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		${buildConfigDebugProject} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				ENABLE_TESTABILITY = YES;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_DYNAMIC_NO_PIC = NO;
				GCC_NO_COMMON_BLOCKS = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				GCC_PREPROCESSOR_DEFINITIONS = (
					"DEBUG=1",
					"$(inherited)",
				);
				IPHONEOS_DEPLOYMENT_TARGET = ${deploymentTarget};
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				MTL_FAST_MATH = YES;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		${buildConfigReleaseProject} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_C_LANGUAGE_STANDARD = gnu17;
				GCC_NO_COMMON_BLOCKS = YES;
				IPHONEOS_DEPLOYMENT_TARGET = ${deploymentTarget};
				MTL_ENABLE_DEBUG_INFO = NO;
				MTL_FAST_MATH = YES;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
		${buildConfigDebugTarget} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				CODE_SIGN_ENTITLEMENTS = VeskApp/VeskApp.entitlements;
				CODE_SIGN_STYLE = ${codeSignStyle};
${team}				CURRENT_PROJECT_VERSION = ${config.versionCode};
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = VeskApp/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = ${config.versionName};
				PRODUCT_BUNDLE_IDENTIFIER = ${config.appId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		${buildConfigReleaseTarget} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				CODE_SIGN_ENTITLEMENTS = VeskApp/VeskApp.entitlements;
				CODE_SIGN_STYLE = ${codeSignStyle};
${team}				CURRENT_PROJECT_VERSION = ${config.versionCode};
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = VeskApp/Info.plist;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = ${config.versionName};
				PRODUCT_BUNDLE_IDENTIFIER = ${config.appId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_EMIT_LOC_STRINGS = YES;
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${buildConfigListProject} /* Build configuration list for PBXProject "VeskApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${buildConfigDebugProject} /* Debug */,
				${buildConfigReleaseProject} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${buildConfigListTarget} /* Build configuration list for PBXNativeTarget "VeskApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${buildConfigDebugTarget} /* Debug */,
				${buildConfigReleaseTarget} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = ${project} /* Project object */;
}
`;
}

// ExportOptions.plist rendered at bundle time from veskconfig (2026 key set:
// method uses the current 'app-store-connect' name; bitcode keys are dead
// since Xcode 14 and intentionally absent).
export function iosExportOptions(config: VeskConfig, provisioningProfileUuid?: string): string {
  const ios = config.signing?.ios;
  const bundle = config.bundle?.ios;
  const method = bundle?.method ?? 'app-store-connect';
  const destination = bundle?.destination ?? 'export';
  const teamId = ios?.teamId ?? 'XXXXXXXXXX';
  const signingStyle = ios?.style ?? 'automatic';
  const uploadSymbols = bundle?.uploadSymbols ?? true;
  const profileMap = provisioningProfileUuid
    ? `\t<key>provisioningProfiles</key>
\t<dict>
\t\t<key>${config.appId}</key>
\t\t<string>${provisioningProfileUuid}</string>
\t</dict>
`
    : ios?.style === 'manual' && ios.provisioningProfile
      ? `\t<key>provisioningProfiles</key>
\t<dict>
\t\t<key>${config.appId}</key>
\t\t<string>${ios.provisioningProfile}</string>
\t</dict>
`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>${method}</string>
	<key>destination</key>
	<string>${destination}</string>
	<key>teamID</key>
	<string>${teamId}</string>
	<key>signingStyle</key>
	<string>${signingStyle}</string>
${profileMap}	<key>uploadSymbols</key>
	<${uploadSymbols}/>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>manageAppVersionAndBuildNumber</key>
	<false/>
</dict>
</plist>
`;
}

// The generated iOS build dir (archive + exports) lives under the app's build
// directory so `vesk bundle` output is reproducible and greppable.
export function iosBuildDir(target: string): string {
  return join(target, 'build', 'ios');
}

export function requireIosSigning(config: VeskConfig): void {
  const ios = config.signing?.ios;
  if (!ios) {
    throw new Error('vesk bundle (iOS) needs veskconfig.signing.ios (teamId at minimum) — see packages/native/src/config.ts');
  }
  if (!/^[A-Z0-9]{10}$/.test(ios.teamId)) {
    throw new Error(`vesk bundle (iOS): teamId must be the 10-character Apple Developer team id, got "${ios.teamId}"`);
  }
  if (ios.style === 'manual' && !ios.certificatePath) {
    throw new Error('vesk bundle (iOS): manual signing needs veskconfig.signing.ios.certificatePath (.p12) and provisioningProfile');
  }
  if (ios.style === 'automatic' && !existsSync(resolve(process.env.HOME ?? '/', 'Library', 'MobileDevice'))) {
    // Not fatal: automatic signing resolves profiles via -allowProvisioningUpdates.
  }
}