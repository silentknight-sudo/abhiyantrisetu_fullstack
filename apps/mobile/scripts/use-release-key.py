"""Point the generated Android release build at the release keystore.

`expo prebuild` writes android/app/build.gradle with the release build signed by the
debug key. CI runs this after prebuild when the ANDROID_KEYSTORE_* secrets exist; the
key details are read from gradle.properties (SETU_STORE_FILE and friends).
"""
import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else 'android/app/build.gradle'
src = open(path).read()

signing = """signingConfigs {
        release {
            storeFile file(SETU_STORE_FILE)
            storePassword SETU_STORE_PASSWORD
            keyAlias SETU_KEY_ALIAS
            keyPassword SETU_KEY_PASSWORD
        }"""
if 'SETU_STORE_FILE' not in src:
    src = src.replace('signingConfigs {', signing, 1)
# The release build type is the only `release {` block that mentions the debug key.
src, n = re.subn(
    r'(buildTypes \{.*?release \{[^{}]*?)signingConfig signingConfigs\.debug',
    r'\1signingConfig signingConfigs.release',
    src,
    count=1,
    flags=re.S,
)
if n != 1:
    sys.exit('Could not find the release build type in ' + path)
open(path, 'w').write(src)
print('Release build now signed with the release key')
