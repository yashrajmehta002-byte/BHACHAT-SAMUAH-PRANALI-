import JSZip from 'jszip';

export interface AndroidProjectConfig {
  applicationId: string;
  versionName: string;
  versionCode: number;
  updateJsonUrl: string;
}

export interface GeneratedProjectFile {
  path: string;
  content: string;
  descriptionHi: string;
  descriptionEn: string;
}

const ROOT_BUILD_GRADLE_KTS = `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
`;

const ROOT_SETTINGS_GRADLE_KTS = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "AshaManagement"
include(":app")
`;

const ROOT_GRADLE_PROPERTIES = `org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`;

const GRADLE_WRAPPER_PROPERTIES = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

const ROOT_README_MD = `# आशा मैनेजमेंट — Android ऐप (APK) प्रोजेक्ट

ऑफ़लाइन ऐप: डेटा फ़ोन में रहता है, फ़िंगरप्रिंट/स्क्रीन-लॉक से खुलता है, हिंदी/English दोनों।

## APK कैसे बनाएं (सबसे आसान — कंप्यूटर पर कुछ इंस्टॉल नहीं करना)

1. github.com पर मुफ़्त अकाउंट बनाएं → **New repository** → नाम \`asha-management\` → **Private** चुनें।
2. इस फ़ोल्डर की सारी फ़ाइलें (\`.github\` फ़ोल्डर समेत) उस repository में अपलोड करें
   (Add file → Upload files; या \`git push\`)।
3. repository में **Actions** टैब → **Build APK** → **Run workflow**।
4. ~5–8 मिनट बाद रन खोलें → नीचे **Artifacts** में \`AshaManagement-apk\` डाउनलोड करें → उसके अंदर \`AshaManagement.apk\`।
5. APK फ़ोन में भेजें और इंस्टॉल करें (फ़ोन "अज्ञात स्रोत से इंस्टॉल" की अनुमति मांगेगा)।

विकल्प: Android Studio में फ़ोल्डर खोलें → Build → Build APK(s)।
कमांड लाइन: \`gradle assembleRelease\` (Gradle 8.9+, JDK 17, Android SDK 34)।

## ऑटो-अपडेट कैसे चलाएं

1. \`app/build.gradle.kts\` में \`versionCode\` बढ़ाएं (1→2→3) और \`versionName\` बदलें।
2. GitHub पर टैग बनाएं, जैसे \`v1.0.1\` (Releases → Draft a new release → नया टैग)।
   Actions अपने-आप APK बनाकर **Release** में \`AshaManagement.apk\` और \`version.json\` रख देगा।
3. ऐप → सेटिंग → **अपडेट लिंक** में एक बार यह डालें:
   \`https://github.com/<आपका-यूज़रनेम>/asha-management/releases/latest/download/version.json\`
4. अब ऐप खुलते ही जांचेगा। नया वर्ज़न होने पर ऊपर "अपडेट" बटन आएगा → दबाएं → डाउनलोड → इंस्टॉल।
   पहली बार Android "इस ऐप को इंस्टॉल की अनुमति" मांगेगा; दे दें। डेटा नहीं मिटता।

> **ज़रूरी:** \`app/asha-release.jks\` (साइनिंग कुंजी) ही हर अपडेट पर इस्तेमाल होती है। इसे बदला/खोया तो नया APK
> पुराने ऐप के ऊपर इंस्टॉल नहीं होगा। इसकी कॉपी सुरक्षित रखें और repository **Private** रखें।
> (पासवर्ड \`app/build.gradle.kts\` में है; चाहें तो बदलकर नई कुंजी बना सकते हैं, पर तब पुराना ऐप हटाकर इंस्टॉल करना होगा।)

## डेटा सुरक्षा (अनइंस्टॉल / फ़ोन बदलने पर)

* हर बदलाव के बाद ऐप अपने-आप \`Documents/AshaManagement/asha_backup.json\` में बैकअप रखता है।
* दोबारा इंस्टॉल करने पर: ऐप खोलें → सेटिंग (या पहली स्क्रीन) → **बैकअप से वापस लाएं** → वह फ़ाइल चुनें।
  (Android 10+ में नियम की वजह से नया इंस्टॉल पुरानी फ़ाइल खुद नहीं देख सकता, इसलिए एक बार फ़ाइल चुननी पड़ती है।)
* अगर फ़ोन में Google Backup चालू है, तो ऐप के अंदर रखी बैकअप कॉपी दोबारा इंस्टॉल पर अपने-आप लौट सकती है।
* फ़ोन बदलने/खोने के लिए: सेटिंग → **Drive / WhatsApp पर भेजें** से फ़ाइल Google Drive में सुरक्षित रखें।

## फ़ाइलें

* \`app/src/main/assets/www/index.html\` — पूरा ऐप (स्क्रीन, लॉजिक, हिंदी/English, रिपोर्ट, नोटिस)
* \`app/src/main/java/.../MainActivity.kt\` — फ़िंगरप्रिंट लॉक, बैकअप, प्रिंट/PDF, शेयर, SMS, कैमरा, अपडेट
* \`.github/workflows/build-apk.yml\` — क्लाउड में APK बनाने की फ़ाइल
`;

function buildAppGradleKts(config: AndroidProjectConfig): string {
  return `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ashamanagement.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "${config.applicationId}"
        minSdk = 24
        targetSdk = 34
        versionCode = ${config.versionCode}
        versionName = "${config.versionName}"

        buildConfigField("String", "DEFAULT_UPDATE_URL", "\\"${config.updateJsonUrl.replace(/"/g, '\\"')}\\"")
    }

    signingConfigs {
        create("release") {
            val keystoreFile = file("asha-release.jks")
            if (keystoreFile.exists()) {
                storeFile = keystoreFile
                storePassword = System.getenv("ASHA_STORE_PASS") ?: "Asha@2026"
                keyAlias = System.getenv("ASHA_KEY_ALIAS") ?: "asha"
                keyPassword = System.getenv("ASHA_KEY_PASS") ?: "Asha@2026"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val keystoreFile = file("asha-release.jks")
            if (keystoreFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
`;
}

const ANDROID_MANIFEST_XML = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission
        android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="28" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.AshaManagement"
        android:usesCleartextTraffic="false">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
`;

const MAIN_ACTIVITY_KT = `package com.ashamanagement.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraOutputUri: Uri? = null
    private val ioExecutor = Executors.newSingleThreadExecutor()

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ ->
        // Camera permission result handled gracefully; picker still opens
    }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val uris = if (result.resultCode == Activity.RESULT_OK) {
            when {
                result.data?.data != null -> arrayOf(result.data!!.data!!)
                cameraOutputUri != null -> arrayOf(cameraOutputUri!!)
                else -> null
            }
        } else {
            null
        }
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
        cameraOutputUri = null
    }

    private val restoreBackupLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            try {
                val jsonText = contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
                if (!jsonText.isNullOrBlank()) {
                    val escaped = JSONObject.quote(jsonText)
                    runOnUiThread {
                        webView.evaluateJavascript("window.onNativeBackupRestored($escaped);", null)
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this, "Backup read failed: \${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        webView.addJavascriptInterface(AshaNativeBridge(), "AshaNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("tel:") ||
                    url.startsWith("sms:") ||
                    url.startsWith("mailto:") ||
                    url.startsWith("whatsapp:") ||
                    url.startsWith("https://wa.me/")
                ) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (_: Exception) {
                        Toast.makeText(this@MainActivity, "No app available to open link", Toast.LENGTH_SHORT).show()
                    }
                    return true
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                }

                val captureIntent = try {
                    val photoFile = File(cacheDir, "asha_capture_\${System.currentTimeMillis()}.jpg")
                    val photoUri = FileProvider.getUriForFile(this@MainActivity, "\$packageName.fileprovider", photoFile)
                    cameraOutputUri = photoUri
                    Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                        putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                        addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                    }
                } catch (_: Exception) {
                    null
                }

                val contentIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "image/*"
                }
                val chooser = Intent.createChooser(contentIntent, "फ़ोटो चुनें / Select Photo")
                if (captureIntent != null) {
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
                }
                fileChooserLauncher.launch(chooser)
                return true
            }
        }

        authenticateAndLoad()
    }

    private fun authenticateAndLoad() {
        val biometricManager = BiometricManager.from(this)
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL

        if (biometricManager.canAuthenticate(authenticators) == BiometricManager.BIOMETRIC_SUCCESS) {
            val executor = ContextCompat.getMainExecutor(this)
            val prompt = BiometricPrompt(
                this,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        webView.loadUrl("file:///android_asset/www/index.html")
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        if (errorCode == BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL ||
                            errorCode == BiometricPrompt.ERROR_HW_UNAVAILABLE
                        ) {
                            webView.loadUrl("file:///android_asset/www/index.html")
                        } else {
                            Toast.makeText(this@MainActivity, errString, Toast.LENGTH_SHORT).show()
                            finish()
                        }
                    }
                }
            )

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("आशा मैनेजमेंट / Asha Management")
                .setSubtitle("फ़िंगरप्रिंट या स्क्रीन-लॉक से खोलें / Unlock with biometric or screen lock")
                .setAllowedAuthenticators(authenticators)
                .build()

            prompt.authenticate(promptInfo)
        } else {
            webView.loadUrl("file:///android_asset/www/index.html")
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    inner class AshaNativeBridge {

        @JavascriptInterface
        fun getAppVersion(): String {
            return JSONObject().apply {
                put("versionName", BuildConfig.VERSION_NAME)
                put("versionCode", BuildConfig.VERSION_CODE)
                put("defaultUpdateUrl", BuildConfig.DEFAULT_UPDATE_URL)
            }.toString()
        }

        @JavascriptInterface
        fun autoBackup(jsonContent: String) {
            ioExecutor.execute {
                try {
                    val internalFile = File(filesDir, "asha_backup.json")
                    internalFile.writeText(jsonContent, Charsets.UTF_8)

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val resolver = contentResolver
                        val selection = "\${MediaStore.MediaColumns.DISPLAY_NAME}=? AND \${MediaStore.MediaColumns.RELATIVE_PATH}=?"
                        val args = arrayOf("asha_backup.json", "Documents/AshaManagement/")
                        resolver.delete(MediaStore.Files.getContentUri("external"), selection, args)

                        val values = ContentValues().apply {
                            put(MediaStore.MediaColumns.DISPLAY_NAME, "asha_backup.json")
                            put(MediaStore.MediaColumns.MIME_TYPE, "application/json")
                            put(MediaStore.MediaColumns.RELATIVE_PATH, "Documents/AshaManagement")
                        }
                        val uri = resolver.insert(MediaStore.Files.getContentUri("external"), values)
                        if (uri != null) {
                            resolver.openOutputStream(uri)?.use { out ->
                                out.write(jsonContent.toByteArray(Charsets.UTF_8))
                            }
                        }
                    } else {
                        val dir = File(
                            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS),
                            "AshaManagement"
                        )
                        if (!dir.exists()) dir.mkdirs()
                        File(dir, "asha_backup.json").writeText(jsonContent, Charsets.UTF_8)
                    }
                } catch (_: Exception) {
                    // Internal backup already saved safely
                }
            }
        }

        @JavascriptInterface
        fun openRestorePicker() {
            runOnUiThread {
                restoreBackupLauncher.launch(arrayOf("application/json", "*/*"))
            }
        }

        @JavascriptInterface
        fun shareBackupFile(jsonContent: String) {
            try {
                val shareFile = File(cacheDir, "asha_backup.json")
                shareFile.writeText(jsonContent, Charsets.UTF_8)
                val uri = FileProvider.getUriForFile(
                    this@MainActivity,
                    "\$packageName.fileprovider",
                    shareFile
                )
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/json"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, "Asha Management Backup")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(intent, "बैकअप भेजें / Share Backup"))
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun shareText(text: String) {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            }
            startActivity(Intent.createChooser(intent, "शेयर करें / Share"))
        }

        @JavascriptInterface
        fun sendSms(phone: String, message: String) {
            val uri = Uri.parse("smsto:\$phone")
            val intent = Intent(Intent.ACTION_SENDTO, uri).apply {
                putExtra("sms_body", message)
            }
            startActivity(intent)
        }

        @JavascriptInterface
        fun printReport() {
            runOnUiThread {
                val printManager = getSystemService(Context.PRINT_SERVICE) as PrintManager
                val adapter = webView.createPrintDocumentAdapter("AshaManagement_Report")
                printManager.print("AshaManagement Report", adapter, PrintAttributes.Builder().build())
            }
        }

        @JavascriptInterface
        fun checkUpdate(versionJsonUrl: String) {
            ioExecutor.execute {
                try {
                    val conn = (URL(versionJsonUrl).openConnection() as HttpURLConnection).apply {
                        connectTimeout = 8000
                        readTimeout = 8000
                    }
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(body)
                    val remoteCode = json.optInt("versionCode", 0)
                    val remoteName = json.optString("versionName", "")
                    val apkUrl = json.optString("apkUrl", "")
                    val payload = JSONObject().apply {
                        put("hasUpdate", remoteCode > BuildConfig.VERSION_CODE && apkUrl.isNotBlank())
                        put("versionCode", remoteCode)
                        put("versionName", remoteName)
                        put("apkUrl", apkUrl)
                    }.toString()
                    runOnUiThread {
                        webView.evaluateJavascript("window.onNativeUpdateResult($payload);", null)
                    }
                } catch (_: Exception) {
                    // Offline or invalid URL
                }
            }
        }

        @JavascriptInterface
        fun downloadAndInstallApk(apkUrl: String) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "कृपया Unknown Apps इंस्टॉल की अनुमति दें", Toast.LENGTH_LONG).show()
                    val permIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:\$packageName"))
                    startActivity(permIntent)
                }
                return
            }
            ioExecutor.execute {
                try {
                    var currentUrl = apkUrl
                    var conn: HttpURLConnection
                    var redirects = 0
                    while (true) {
                        conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                            instanceFollowRedirects = true
                            connectTimeout = 15000
                            readTimeout = 30000
                        }
                        val code = conn.responseCode
                        if (code in 300..399 && redirects < 5) {
                            val loc = conn.getHeaderField("Location") ?: break
                            currentUrl = loc
                            redirects++
                            conn.disconnect()
                        } else {
                            break
                        }
                    }
                    val outFile = File(cacheDir, "AshaManagement-update.apk")
                    conn.inputStream.use { input ->
                        FileOutputStream(outFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    val apkUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "\$packageName.fileprovider",
                        outFile
                    )
                    val installIntent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(apkUri, "application/vnd.android.package-archive")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    runOnUiThread { startActivity(installIntent) }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Update failed: \${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}
`;

const GITHUB_WORKFLOW_YML = `name: Build APK

on:
  workflow_dispatch:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Set up Android SDK
        uses: android-actions/setup-android@v3

      - name: Set up Gradle 8.9
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: "8.9"

      - name: Ensure release signing keystore exists
        run: |
          if [ ! -f app/asha-release.jks ]; then
            keytool -genkeypair -v \\
              -keystore app/asha-release.jks \\
              -storepass "\${{ secrets.ASHA_STORE_PASS || 'Asha@2026' }}" \\
              -keypass "\${{ secrets.ASHA_KEY_PASS || 'Asha@2026' }}" \\
              -alias "\${{ secrets.ASHA_KEY_ALIAS || 'asha' }}" \\
              -keyalg RSA -keysize 2048 -validity 10000 \\
              -dname "CN=AshaManagement, OU=Health, O=ASHA, L=India, S=IN, C=IN"
          fi

      - name: Build Release APK
        env:
          ASHA_STORE_PASS: \${{ secrets.ASHA_STORE_PASS || 'Asha@2026' }}
          ASHA_KEY_ALIAS: \${{ secrets.ASHA_KEY_ALIAS || 'asha' }}
          ASHA_KEY_PASS: \${{ secrets.ASHA_KEY_PASS || 'Asha@2026' }}
        run: gradle assembleRelease

      - name: Prepare AshaManagement.apk and version.json
        run: |
          mkdir -p release-out
          APK_PATH=$(find app/build/outputs/apk/release -name "*.apk" | head -n 1)
          cp "$APK_PATH" release-out/AshaManagement.apk
          VERSION_CODE=$(grep -E "versionCode\\s*=" app/build.gradle.kts | head -n 1 | grep -oE "[0-9]+")
          VERSION_NAME=$(grep -E "versionName\\s*=" app/build.gradle.kts | head -n 1 | sed -E 's/.*"([^"]+)".*/\\1/')
          TAG_NAME="\${GITHUB_REF_NAME:-v$VERSION_NAME}"
          cat <<EOF > release-out/version.json
          {
            "versionCode": $VERSION_CODE,
            "versionName": "$VERSION_NAME",
            "apkUrl": "https://github.com/\${{ github.repository }}/releases/download/$TAG_NAME/AshaManagement.apk"
          }
          EOF

      - name: Upload AshaManagement-apk Artifact
        uses: actions/upload-artifact@v4
        with:
          name: AshaManagement-apk
          path: release-out/AshaManagement.apk

      - name: Publish GitHub Release (on tag push)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: |
            release-out/AshaManagement.apk
            release-out/version.json
`;

export function buildStandaloneWwwHtml(config: AndroidProjectConfig): string {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>हॉस्पिटल मैनेजमेंट ऐप | Hospital Management App</title>
  <style>
    :root { --teal:#0f766e; --teal-light:#f0fdfa; --bg:#f8fafc; --card:#ffffff; --ink:#0f172a; --muted:#475569; --border:#e2e8f0; --rose:#be123c; --amber:#b45309; }
    * { box-sizing:border-box; font-family: system-ui, -apple-system, 'Noto Sans Devanagari', sans-serif; }
    body { margin:0; background:var(--bg); color:var(--ink); padding-bottom:76px; }
    header { position:sticky; top:0; z-index:20; background:#fff; border-bottom:1px solid var(--border); padding:12px 16px; display:flex; align-items:center; justify-content:space-between; }
    header h1 { margin:0; font-size:17px; color:var(--teal); }
    .btn { border:1px solid var(--border); background:#fff; color:var(--ink); padding:8px 12px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-primary { background:var(--teal); border-color:var(--teal); color:#fff; }
    .container { max-width:960px; margin:0 auto; padding:16px; }
    .stats { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:16px; }
    @media(min-width:720px){ .stats { grid-template-columns:repeat(4,1fr); } }
    .card { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:14px; margin-bottom:12px; }
    .stat-num { font-size:24px; font-weight:700; margin-top:4px; font-variant-numeric:tabular-nums; }
    .stat-lbl { font-size:12px; color:var(--muted); }
    .row { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding:12px 0; border-bottom:1px solid var(--border); }
    .row:last-child { border-bottom:none; }
    .meta { font-size:12px; color:var(--muted); margin-top:4px; }
    .high { color:var(--rose); font-weight:700; }
    input, select, textarea { width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; font-size:14px; margin-top:4px; margin-bottom:10px; background:#fff; }
    label { font-size:12px; font-weight:600; color:var(--muted); }
    nav.bottom { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1px solid var(--border); display:grid; grid-template-columns:repeat(4,1fr); height:62px; z-index:20; }
    nav.bottom button { border:none; background:none; font-size:11px; font-weight:600; color:var(--muted); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
    nav.bottom button.active { color:var(--teal); }
    .hidden { display:none !important; }
    .update-bar { background:var(--teal-light); border:1px solid #99f6e4; padding:10px 14px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; }
    @media print { nav.bottom, header button, .no-print { display:none !important; } body { padding-bottom:0; background:#fff; } }
  </style>
</head>
<body>
  <header>
    <h1 id="brandTitle">हॉस्पिटल मैनेजमेंट ऐप</h1>
    <div style="display:flex; gap:8px;">
      <button class="btn" onclick="toggleLang()" id="langBtn">English</button>
      <button class="btn btn-primary" onclick="openAddModal()" id="addTopBtn">+ जोड़ें</button>
    </div>
  </header>

  <div class="container">
    <div id="updateBanner" class="update-bar hidden">
      <span id="updateText" style="font-size:13px;font-weight:600;">नया अपडेट उपलब्ध है</span>
      <button class="btn btn-primary" onclick="installNativeUpdate()">अपडेट</button>
    </div>

    <section id="view-dashboard">
      <div class="stats">
        <div class="card"><div class="stat-lbl" data-k="total">कुल आशा</div><div class="stat-num" id="sTotal">0</div></div>
        <div class="card"><div class="stat-lbl" data-k="due">उप-केंद्र / AWC</div><div class="stat-num" id="sDue">0</div></div>
        <div class="card"><div class="stat-lbl" data-k="hrp">जनसंख्या</div><div class="stat-num" id="sPop">0</div></div>
        <div class="card"><div class="stat-lbl" data-k="inc">क्लेम वाउचर</div><div class="stat-num" id="sInc">0</div></div>
      </div>
      <div class="card">
        <strong data-k="dueList">आशा कार्यकर्ता सूची</strong>
        <div id="dashDueList" style="margin-top:8px;"></div>
      </div>
    </section>

    <section id="view-register" class="hidden">
      <input type="text" id="searchBox" placeholder="आशा, पति, सब सेंटर, AWC या मोबाइल से खोजें..." oninput="renderAll()" />
      <div class="card" id="registerList"></div>
    </section>

    <section id="view-reports" class="hidden">
      <div class="card no-print" style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="printNative()">PDF / प्रिंट</button>
        <button class="btn" onclick="exportExcelCsv()">Excel (.csv)</button>
        <button class="btn" onclick="exportWordDoc()">Word (.doc)</button>
        <button class="btn" onclick="shareWhatsApp()">WhatsApp</button>
        <button class="btn" onclick="shareSms()">SMS</button>
        <button class="btn" onclick="shareSummary()">शेयर</button>
      </div>
      <div class="card no-print">
        <strong>त्वरित संचालन (वाउचर / बैठक / छुट्टी / हेडकाउंट / नोटिस)</strong>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
          <button class="btn" onclick="addSampleIncentive()">+ क्लेम वाउचर जमा</button>
          <button class="btn" onclick="addQuickMeeting()">+ सेक्टर बैठक</button>
          <button class="btn" onclick="addQuickLeave()">+ छुट्टी दर्ज</button>
          <button class="btn" onclick="addQuickHeadCount()">+ हेडकाउंट (PW/धात्री)</button>
          <button class="btn" onclick="addQuickNotice()">+ A4 नोटिस</button>
        </div>
      </div>
      <div class="card">
        <strong>क्लेम वाउचर, बैठक, छुट्टी व नोटिस सारांश</strong>
        <div id="incentiveList" style="margin-top:8px;"></div>
      </div>
    </section>

    <section id="view-settings" class="hidden">
      <div class="card">
        <strong>डेटा बैकअप (asha_backup.json)</strong>
        <p class="meta">हर बदलाव के बाद Documents/AshaManagement/asha_backup.json में बैकअप सुरक्षित होता है।</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn btn-primary" onclick="exportBackup()">बैकअप सेव / शेयर</button>
          <button class="btn" onclick="restoreBackup()">बैकअप से वापस लाएं</button>
          <input type="file" id="webRestoreInput" accept=".json" class="hidden" onchange="handleWebRestore(event)" />
        </div>
      </div>
      <div class="card">
        <label>अपडेट लिंक (version.json)</label>
        <input type="url" id="updateUrlInput" placeholder="https://github.com/user/asha-management/releases/latest/download/version.json" value="${config.updateJsonUrl}" />
        <button class="btn" onclick="saveUpdateUrl()">लिंक सेव करें व जांचें</button>
        <p class="meta">Version ${config.versionName} (Code ${config.versionCode})</p>
      </div>
    </section>
  </div>

  <div id="addModal" class="hidden" style="position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:50;display:flex;align-items:flex-end;justify-content:center;">
    <div class="card" style="width:100%;max-width:540px;margin:0;border-radius:20px 20px 0 0;max-height:92vh;overflow:auto;">
      <strong style="font-size:16px;">आशा जोड़ें (पूर्ण प्रोफ़ाइल)</strong>
      <label style="display:block;margin-top:10px;">अस्पताल / PHC का नाम *</label><input id="fHospital" placeholder="उदा. PHC सोम / CHC झाड़ोल" />
      <label>आशा का नाम *</label><input id="fName" />
      <label>आशा का मोबाइल नंबर</label><input id="fPhone" type="tel" />
      <label>आशा के पति का नाम</label><input id="fHusbandName" />
      <label>पति का फोन नंबर</label><input id="fHusbandPhone" type="tel" />
      <label>सब सेंटर का नाम</label><input id="fSubCenter" />
      <label>सब सेंटर का पता</label><input id="fSubCenterAddr" />
      <label>एडब्ल्यूसी (AWC) का नाम</label><input id="fAwc" />
      <label>AWC कार्यकर्ता का नाम</label><input id="fAwcWorkerName" />
      <label>AWC कार्यकर्ता का नंबर</label><input id="fAwcWorkerPhone" type="tel" />
      <label>साथिन (Sathin) का नाम</label><input id="fSathinName" />
      <label>साथिन (Sathin) का नंबर</label><input id="fSathinPhone" type="tel" />
      <label>स्वच्छकर्मी / सचकर्मी का नाम</label><input id="fSwachhKarmiName" />
      <label>स्वच्छकर्मी / सचकर्मी का नंबर</label><input id="fSwachhKarmiPhone" type="tel" />
      <label>गांव / वार्ड</label><input id="fVillage" />
      <label>पदस्थापन की तारीख (जॉइनिंग डेट)</label><input id="fJoining" type="date" />
      <label>एएनएम (ANM) का नाम</label><input id="fAnmName" />
      <label>एएनएम (ANM) का नंबर</label><input id="fAnmPhone" type="tel" />
      <label>सीएचओ (CHO) का नाम</label><input id="fChoName" />
      <label>सीएचओ (CHO) का नंबर</label><input id="fChoPhone" type="tel" />
      <label>आधार कार्ड नंबर</label><input id="fAadhaar" />
      <label>जन आधार कार्ड नंबर</label><input id="fJanAadhaar" />
      <label>बैंक का नाम</label><input id="fBankName" />
      <label>अकाउंट नंबर</label><input id="fBankAcc" />
      <label>आईएफएससी कोड (IFSC)</label><input id="fIfsc" />
      <label>जनसंख्या</label><input id="fPop" type="number" value="1000" />
      <label>अन्य आवश्यक जानकारी / टिप्पणी</label><textarea id="fNotes" rows="2"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="btn" style="flex:1" onclick="closeAddModal()">रद्द करें</button>
        <button class="btn btn-primary" style="flex:1" onclick="saveAsha()">सुरक्षित करें</button>
      </div>
    </div>
  </div>

  <nav class="bottom">
    <button class="active" onclick="switchTab('dashboard', this)">डैशबोर्ड</button>
    <button onclick="switchTab('register', this)">आशा सूची</button>
    <button onclick="switchTab('reports', this)">रिपोर्ट व कार्य</button>
    <button onclick="switchTab('settings', this)">सेटिंग्स</button>
  </nav>

  <script>
    var KEY = 'asha_android_state_v2';
    var state = JSON.parse(localStorage.getItem(KEY) || '{"lang":"hi","ashas":[],"incentives":[],"meetings":[],"leaves":[],"headCounts":[],"notices":[],"updateUrl":"${config.updateJsonUrl}"}');
    state.meetings = state.meetings || [];
    state.leaves = state.leaves || [];
    state.headCounts = state.headCounts || [];
    state.notices = state.notices || [];
    var pendingApkUrl = '';

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch(e) {}
      if (window.AshaNative && window.AshaNative.autoBackup) {
        window.AshaNative.autoBackup(JSON.stringify(state, null, 2));
      }
    }

    function switchTab(id, btn) {
      ['dashboard','register','reports','settings'].forEach(function(v){
        document.getElementById('view-' + v).classList.toggle('hidden', v !== id);
      });
      document.querySelectorAll('nav.bottom button').forEach(function(b){ b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
    }

    function toggleLang() {
      state.lang = state.lang === 'hi' ? 'en' : 'hi';
      persist();
      renderAll();
    }

    function openAddModal() { document.getElementById('addModal').classList.remove('hidden'); }
    function closeAddModal() { document.getElementById('addModal').classList.add('hidden'); }
    function val(id) { return (document.getElementById(id).value || '').trim(); }
    function maskLast4(s) { return s.length > 4 ? 'XXXX-' + s.slice(-4) : s; }

    function saveAsha() {
      var name = val('fName');
      if (!name) return;
      state.ashas = state.ashas || [];
      state.ashas.unshift({
        id: Date.now().toString(),
        hospitalName: val('fHospital'),
        name: name,
        phone: val('fPhone'),
        husbandName: val('fHusbandName'),
        husbandPhone: val('fHusbandPhone'),
        subCenter: val('fSubCenter'),
        subCenterAddress: val('fSubCenterAddr'),
        awcName: val('fAwc'),
        awcWorkerName: val('fAwcWorkerName'),
        awcWorkerPhone: val('fAwcWorkerPhone'),
        sathinName: val('fSathinName'),
        sathinPhone: val('fSathinPhone'),
        swachhKarmiName: val('fSwachhKarmiName'),
        swachhKarmiPhone: val('fSwachhKarmiPhone'),
        village: val('fVillage'),
        joiningDate: val('fJoining'),
        anmName: val('fAnmName'),
        anmPhone: val('fAnmPhone'),
        choName: val('fChoName'),
        choPhone: val('fChoPhone'),
        aadhaarMasked: maskLast4(val('fAadhaar')),
        janAadhaar: val('fJanAadhaar'),
        bankName: val('fBankName'),
        bankAccountMasked: maskLast4(val('fBankAcc')),
        ifsc: val('fIfsc').toUpperCase(),
        population: Number(val('fPop')) || 0,
        notes: val('fNotes')
      });
      ['fHospital','fName','fPhone','fHusbandName','fHusbandPhone','fSubCenter','fSubCenterAddr','fAwc','fAwcWorkerName','fAwcWorkerPhone','fSathinName','fSathinPhone','fSwachhKarmiName','fSwachhKarmiPhone','fVillage','fAnmName','fAnmPhone','fChoName','fChoPhone','fAadhaar','fJanAadhaar','fBankName','fBankAcc','fIfsc','fNotes'].forEach(function(id){ document.getElementById(id).value = ''; });
      closeAddModal();
      persist();
      renderAll();
    }

    function addSampleIncentive() {
      var name = prompt(state.lang === 'hi' ? 'आशा का नाम (क्लेम वाउचर जमा):' : 'ASHA name (Voucher):');
      if (!name) return;
      var todayStr = new Date().toISOString().slice(0, 10);
      state.incentives.unshift({ id: Date.now().toString(), kind: 'voucher', name: name, date: todayStr, status: 'submitted' });
      persist();
      renderAll();
    }

    function addQuickMeeting() {
      var title = prompt(state.lang === 'hi' ? 'बैठक / ट्रेनिंग विषय:' : 'Meeting Title:');
      if (!title) return;
      var present = prompt(state.lang === 'hi' ? 'उपस्थित आशा संख्या:' : 'Present ASHAs count:', String((state.ashas||[]).length));
      state.meetings.unshift({ id: Date.now().toString(), title: title, date: new Date().toISOString().slice(0, 10), present: Number(present)||0 });
      persist();
      renderAll();
    }

    function addQuickLeave() {
      var name = prompt(state.lang === 'hi' ? 'छुट्टी हेतु आशा का नाम:' : 'ASHA name for leave:');
      if (!name) return;
      var days = prompt(state.lang === 'hi' ? 'छुट्टी के दिन:' : 'Leave days:', '1');
      state.leaves.unshift({ id: Date.now().toString(), name: name, date: new Date().toISOString().slice(0, 10), days: Math.max(1, Number(days)||1) });
      persist();
      renderAll();
    }

    function addQuickHeadCount() {
      var name = prompt(state.lang === 'hi' ? 'आशा का नाम (हेडकाउंट):' : 'ASHA name (HeadCount):');
      if (!name) return;
      var pw = Number(prompt(state.lang === 'hi' ? 'गर्भवती (Pregnant) संख्या:' : 'Pregnant Women:', '0')) || 0;
      var dhatri = Number(prompt(state.lang === 'hi' ? 'धात्री (Dhatri) संख्या:' : 'Dhatri Mothers:', '0')) || 0;
      var under16 = Number(prompt(state.lang === 'hi' ? 'कुल बच्चे (0-16 वर्ष):' : 'Children (0-16 yrs):', '0')) || 0;
      state.headCounts.unshift({ id: Date.now().toString(), name: name, date: new Date().toISOString().slice(0, 10), pw: pw, dhatri: dhatri, under16: under16 });
      persist();
      renderAll();
    }

    function addQuickNotice() {
      var title = prompt(state.lang === 'hi' ? 'A4 नोटिस विषय:' : 'Notice Title:');
      if (!title) return;
      var reason = prompt(state.lang === 'hi' ? 'कारण:' : 'Reason:', 'मासिक सेक्टर बैठक सूचना');
      state.notices.unshift({ id: Date.now().toString(), disp: 'DISP/' + new Date().getFullYear() + '/' + (state.notices.length+1), date: new Date().toISOString().slice(0,10), title: title, reason: reason || '-' });
      persist();
      renderAll();
    }

    function renderAll() {
      var hi = state.lang === 'hi';
      var listAll = state.ashas || [];
      document.getElementById('brandTitle').textContent = hi ? 'हॉस्पिटल मैनेजमेंट ऐप' : 'Hospital Management App';
      document.getElementById('langBtn').textContent = hi ? 'English' : 'हिन्दी';
      document.getElementById('sTotal').textContent = listAll.length;
      document.getElementById('sDue').textContent = listAll.filter(function(b){ return !!b.awcName; }).length;
      document.getElementById('sPop').textContent = listAll.reduce(function(a,b){ return a + (b.population||0); }, 0);
      document.getElementById('sInc').textContent = String((state.incentives || []).length);

      function getFilteredList() {
        var q = (document.getElementById('searchBox').value || '').toLowerCase();
        return listAll.filter(function(b){
          return !q || b.name.toLowerCase().indexOf(q) >= 0 || (b.hospitalName||'').toLowerCase().indexOf(q) >= 0 || (b.husbandName||'').toLowerCase().indexOf(q) >= 0 || (b.subCenter||'').toLowerCase().indexOf(q) >= 0 || (b.awcName||'').toLowerCase().indexOf(q) >= 0 || (b.awcWorkerName||'').toLowerCase().indexOf(q) >= 0 || (b.sathinName||'').toLowerCase().indexOf(q) >= 0 || (b.swachhKarmiName||'').toLowerCase().indexOf(q) >= 0;
        });
      }
      var list = getFilteredList();
      document.getElementById('registerList').innerHTML = list.length ? list.map(function(b){
        return '<div class="row"><div><strong>' + esc(b.name) + '</strong>' + (b.hospitalName ? ' <span class="meta">· ' + esc(b.hospitalName) + '</span>' : '') +
          '<div class="meta">' + esc(b.subCenter||'-') + ' · AWC: ' + esc(b.awcName||'-') + ' · पति: ' + esc(b.husbandName||'-') + ' (' + esc(b.husbandPhone||'-') + ')</div>' +
          '<div class="meta">AWC कार्यकर्ता: ' + esc(b.awcWorkerName||'-') + ' (' + esc(b.awcWorkerPhone||'-') + ') · साथिन: ' + esc(b.sathinName||'-') + ' (' + esc(b.sathinPhone||'-') + ')</div>' +
          '<div class="meta">स्वच्छकर्मी: ' + esc(b.swachhKarmiName||'-') + ' (' + esc(b.swachhKarmiPhone||'-') + ') · ANM: ' + esc(b.anmName||'-') + ' · CHO: ' + esc(b.choName||'-') + '</div>' +
          '<div class="meta">' + esc(b.bankName||'-') + ' ' + esc(b.bankAccountMasked||'') + ' (' + esc(b.ifsc||'-') + ') · आधार: ' + esc(b.aadhaarMasked||'-') + '</div></div>' +
          (b.phone ? '<a class="btn" href="tel:' + esc(b.phone) + '">Call</a>' : '') + '</div>';
      }).join('') : '<div class="meta">' + (hi ? 'कोई रिकॉर्ड नहीं' : 'No records') + '</div>';

      document.getElementById('dashDueList').innerHTML = document.getElementById('registerList').innerHTML;

      var opsRows = [];
      (state.incentives || []).forEach(function(i){
        opsRows.push('<div class="row"><div><strong>' + esc(i.name) + '</strong><div class="meta">क्लेम वाउचर · ' + esc(i.date || '-') + '</div></div><strong>' + (hi ? 'वाउचर जमा' : 'Voucher') + '</strong></div>');
      });
      (state.meetings || []).forEach(function(m){
        opsRows.push('<div class="row"><div><strong>' + esc(m.title) + '</strong><div class="meta">बैठक · ' + esc(m.date) + '</div></div><strong>' + m.present + ' उपस्थित</strong></div>');
      });
      (state.leaves || []).forEach(function(l){
        opsRows.push('<div class="row"><div><strong>' + esc(l.name) + '</strong><div class="meta">छुट्टी · ' + esc(l.date) + '</div></div><strong>' + l.days + ' दिन</strong></div>');
      });
      (state.headCounts || []).forEach(function(hc){
        opsRows.push('<div class="row"><div><strong>' + esc(hc.name) + '</strong><div class="meta">हेडकाउंट · ' + esc(hc.date) + '</div></div><span>गर्भवती:' + hc.pw + ' धात्री:' + hc.dhatri + ' बच्चे:' + hc.under16 + '</span></div>');
      });
      (state.notices || []).forEach(function(n){
        opsRows.push('<div class="row"><div><strong>' + esc(n.title) + '</strong><div class="meta">' + esc(n.disp) + ' · ' + esc(n.date) + ' · ' + esc(n.reason) + '</div></div><strong>नोटिस</strong></div>');
      });
      document.getElementById('incentiveList').innerHTML = opsRows.length ? opsRows.join('') : '<div class="meta">' + (hi ? 'कोई रिकॉर्ड दर्ज नहीं' : 'No records yet') + '</div>';
    }

    function exportBackup() {
      var json = JSON.stringify(state, null, 2);
      if (window.AshaNative && window.AshaNative.shareBackupFile) {
        window.AshaNative.shareBackupFile(json);
      } else {
        var blob = new Blob([json], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'asha_backup.json';
        a.click();
      }
    }

    function restoreBackup() {
      if (window.AshaNative && window.AshaNative.openRestorePicker) {
        window.AshaNative.openRestorePicker();
      } else {
        document.getElementById('webRestoreInput').click();
      }
    }

    function handleWebRestore(ev) {
      var file = ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function() { window.onNativeBackupRestored(reader.result); };
      reader.readAsText(file);
    }

    window.onNativeBackupRestored = function(jsonText) {
      try {
        var parsed = JSON.parse(jsonText);
        if (parsed && Array.isArray(parsed.ashas)) {
          state = parsed;
          state.meetings = state.meetings || [];
          state.leaves = state.leaves || [];
          state.headCounts = state.headCounts || [];
          state.notices = state.notices || [];
          persist();
          renderAll();
        }
      } catch(e) {}
    };

    function printNative() {
      if (window.AshaNative && window.AshaNative.printReport) window.AshaNative.printReport();
      else window.print();
    }

    function buildReportText() {
      var list = state.ashas || [];
      return 'Hospital Management App Summary: ASHAs=' + list.length + ', Vouchers=' + (state.incentives||[]).length + ', Meetings=' + (state.meetings||[]).length + ', Leaves=' + (state.leaves||[]).length + ', Notices=' + (state.notices||[]).length;
    }

    function exportExcelCsv() {
      var headers = ['Hospital','Name','Phone','Husband','Husband Phone','Sub-Center','AWC','AWC Worker','AWC Worker Phone','Sathin','Sathin Phone','SwachhKarmi','SwachhKarmi Phone','ANM','CHO','Bank','IFSC','Aadhaar','Jan Aadhaar'];
      var q = (document.getElementById('searchBox').value || '').toLowerCase();
      var filtered = (state.ashas || []).filter(function(b){
        return !q || b.name.toLowerCase().indexOf(q) >= 0 || (b.hospitalName||'').toLowerCase().indexOf(q) >= 0 || (b.subCenter||'').toLowerCase().indexOf(q) >= 0 || (b.awcName||'').toLowerCase().indexOf(q) >= 0;
      });
      var rows = filtered.map(function(a){
        return [a.hospitalName,a.name,a.phone,a.husbandName,a.husbandPhone,a.subCenter,a.awcName,a.awcWorkerName,a.awcWorkerPhone,a.sathinName,a.sathinPhone,a.swachhKarmiName,a.swachhKarmiPhone,a.anmName,a.choName,a.bankName,a.ifsc,a.aadhaarMasked,a.janAadhaar]
          .map(function(v){ return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(',');
      });
      var csv = '\\uFEFF' + headers.join(',') + '\\n' + rows.join('\\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'HospitalManagement_Report.csv';
      a.click();
    }

    function exportWordDoc() {
      var q = (document.getElementById('searchBox').value || '').toLowerCase();
      var filtered = (state.ashas || []).filter(function(b){
        return !q || b.name.toLowerCase().indexOf(q) >= 0 || (b.hospitalName||'').toLowerCase().indexOf(q) >= 0 || (b.subCenter||'').toLowerCase().indexOf(q) >= 0 || (b.awcName||'').toLowerCase().indexOf(q) >= 0;
      });
      var rows = filtered.map(function(a){
        return '<tr><td>' + esc(a.hospitalName) + '</td><td>' + esc(a.name) + ' (' + esc(a.phone) + ')</td><td>' + esc(a.subCenter) + ' / ' + esc(a.awcName) + '</td><td>' + esc(a.awcWorkerName) + ' (' + esc(a.awcWorkerPhone) + ')</td><td>' + esc(a.sathinName) + ' (' + esc(a.sathinPhone) + ')</td><td>' + esc(a.swachhKarmiName) + ' (' + esc(a.swachhKarmiPhone) + ')</td></tr>';
      }).join('');
      var html = '<html><head><meta charset="utf-8"/></head><body><h2>Hospital Management App Report</h2><table border="1" cellspacing="0" cellpadding="6"><tr><th>Hospital</th><th>ASHA</th><th>SC / AWC</th><th>AWC Worker</th><th>Sathin</th><th>SwachhKarmi</th></tr>' + rows + '</table></body></html>';
      var blob = new Blob(['\\ufeff', html], { type: 'application/msword' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'HospitalManagement_Report.doc';
      a.click();
    }

    function shareWhatsApp() {
      var a = document.createElement('a');
      a.href = 'https://wa.me/?text=' + encodeURIComponent(buildReportText());
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }

    function shareSms() {
      if (window.AshaNative && window.AshaNative.sendSms) {
        window.AshaNative.sendSms('', buildReportText());
      } else {
        window.location.href = 'sms:?body=' + encodeURIComponent(buildReportText());
      }
    }

    function shareSummary() {
      var txt = buildReportText();
      if (window.AshaNative && window.AshaNative.shareText) window.AshaNative.shareText(txt);
      else if (navigator.share) navigator.share({ title: 'Hospital Management App', text: txt }).catch(function(){});
      else shareWhatsApp();
    }

    function saveUpdateUrl() {
      state.updateUrl = document.getElementById('updateUrlInput').value.trim();
      persist();
      if (state.updateUrl && window.AshaNative && window.AshaNative.checkUpdate) {
        window.AshaNative.checkUpdate(state.updateUrl);
      }
    }

    window.onNativeUpdateResult = function(res) {
      if (res && res.hasUpdate) {
        pendingApkUrl = res.apkUrl;
        document.getElementById('updateText').textContent = 'नया अपडेट उपलब्ध: v' + res.versionName;
        document.getElementById('updateBanner').classList.remove('hidden');
      }
    };

    function installNativeUpdate() {
      if (pendingApkUrl && window.AshaNative && window.AshaNative.downloadAndInstallApk) {
        window.AshaNative.downloadAndInstallApk(pendingApkUrl);
      }
    }

    renderAll();
    if (state.updateUrl && window.AshaNative && window.AshaNative.checkUpdate) {
      window.AshaNative.checkUpdate(state.updateUrl);
    }
  </script>
</body>
</html>
`;
}

export function generateAndroidProjectFiles(config: AndroidProjectConfig): GeneratedProjectFile[] {
  return [
    {
      path: 'build.gradle.kts',
      content: ROOT_BUILD_GRADLE_KTS,
      descriptionHi: 'रूट Gradle बिल्ड फ़ाइल (AGP 8.7.3, Kotlin 2.0.21)',
      descriptionEn: 'Root Gradle build file (AGP 8.7.3, Kotlin 2.0.21)',
    },
    {
      path: 'settings.gradle.kts',
      content: ROOT_SETTINGS_GRADLE_KTS,
      descriptionHi: 'प्रोजेक्ट नाम व :app मॉड्यूल सेटिंग',
      descriptionEn: 'Project settings & :app module include',
    },
    {
      path: 'gradle.properties',
      content: ROOT_GRADLE_PROPERTIES,
      descriptionHi: 'Gradle मेमोरी व AndroidX प्रॉपर्टीज',
      descriptionEn: 'Gradle JVM args and AndroidX flags',
    },
    {
      path: 'gradle/wrapper/gradle-wrapper.properties',
      content: GRADLE_WRAPPER_PROPERTIES,
      descriptionHi: 'Gradle 8.9 रैपर कॉन्फ़िगरेशन',
      descriptionEn: 'Gradle 8.9 wrapper distribution config',
    },
    {
      path: 'README.md',
      content: ROOT_README_MD,
      descriptionHi: 'APK बिल्ड, ऑटो-अपडेट व बैकअप गाइड',
      descriptionEn: 'APK build, auto-update & backup documentation',
    },
    {
      path: '.github/workflows/build-apk.yml',
      content: GITHUB_WORKFLOW_YML,
      descriptionHi: 'GitHub Actions क्लाउड APK बिल्ड वर्कफ़्लो',
      descriptionEn: 'GitHub Actions cloud APK & Release workflow',
    },
    {
      path: 'app/build.gradle.kts',
      content: buildAppGradleKts(config),
      descriptionHi: 'ऐप मॉड्यूल SDK 34, वर्ज़न और साइनिंग कॉन्फ़िग',
      descriptionEn: 'App module SDK 34, versioning & release signing',
    },
    {
      path: 'app/proguard-rules.pro',
      content: `# Keep AshaNative JS interface\n-keepclassmembers class com.ashamanagement.app.MainActivity$AshaNativeBridge {\n    @android.webkit.JavascriptInterface <methods>;\n}\n`,
      descriptionHi: 'ProGuard नियम (AshaNative ब्रिज सुरक्षा)',
      descriptionEn: 'ProGuard keep rules for WebView JS bridge',
    },
    {
      path: 'app/src/main/AndroidManifest.xml',
      content: ANDROID_MANIFEST_XML,
      descriptionHi: 'परमिशन (बायोमेट्रिक, कैमरा, इंस्टॉल) व FileProvider',
      descriptionEn: 'Permissions (Biometric, Camera, Install) & FileProvider',
    },
    {
      path: 'app/src/main/java/com/ashamanagement/app/MainActivity.kt',
      content: MAIN_ACTIVITY_KT,
      descriptionHi: 'फ़िंगरप्रिंट लॉक, Documents बैकअप, प्रिंट/PDF व अपडेट',
      descriptionEn: 'Biometric lock, Documents backup, Print/PDF & OTA updater',
    },
    {
      path: 'app/src/main/assets/www/index.html',
      content: buildStandaloneWwwHtml(config),
      descriptionHi: 'ऑफ़लाइन HTML5 ऐप जो APK के अंदर चलता है',
      descriptionEn: 'Self-contained offline HTML5 app bundled inside APK',
    },
    {
      path: 'app/src/main/res/values/strings.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">हॉस्पिटल मैनेजमेंट ऐप</string>\n</resources>\n`,
      descriptionHi: 'ऐप का नाम (हॉस्पिटल मैनेजमेंट ऐप)',
      descriptionEn: 'Android app display name string resource',
    },
    {
      path: 'app/src/main/res/values/themes.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <style name="Theme.AshaManagement" parent="Theme.Material3.DayNight.NoActionBar">\n        <item name="android:statusBarColor">#0F766E</item>\n    </style>\n</resources>\n`,
      descriptionHi: 'Material 3 थीम व स्टेटस बार रंग',
      descriptionEn: 'Material 3 NoActionBar theme & status bar color',
    },
    {
      path: 'app/src/main/res/xml/file_paths.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>\n<paths>\n    <cache-path name="cache" path="." />\n    <files-path name="files" path="." />\n</paths>\n`,
      descriptionHi: 'APK अपडेट व बैकअप शेयर के लिए FileProvider पथ',
      descriptionEn: 'FileProvider paths for APK updates & backup sharing',
    },
    {
      path: 'app/src/main/res/xml/backup_rules.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n    <include domain="file" path="asha_backup.json" />\n</full-backup-content>\n`,
      descriptionHi: 'Google Auto-Backup नियम',
      descriptionEn: 'Android Auto-Backup inclusion rules',
    },
    {
      path: 'app/src/main/res/xml/data_extraction_rules.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup>\n        <include domain="file" path="asha_backup.json" />\n    </cloud-backup>\n</data-extraction-rules>\n`,
      descriptionHi: 'Android 12+ डेटा एक्सट्रैक्शन नियम',
      descriptionEn: 'Android 12+ cloud backup extraction rules',
    },
    {
      path: 'app/src/main/res/drawable/ic_launcher_foreground.xml',
      content: `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,78 C52.2,78 50.5,77.3 49.2,76.1 C33.8,61.9 25,53.4 25,40.8 C25,31.2 32.6,23.5 42,23.5 C47,23.5 51.7,25.7 54,29.5 C56.3,25.7 61,23.5 66,23.5 C75.4,23.5 83,31.2 83,40.8 C83,53.4 74.2,61.9 58.8,76.1 C57.5,77.3 55.8,78 54,78 Z" />
    <path
        android:fillColor="#0F766E"
        android:pathData="M51,37 L57,37 L57,57 L51,57 Z M44,44 L64,44 L64,50 L44,50 Z" />
</vector>
`,
      descriptionHi: 'वेक्टर लॉन्चर आइकन फ़ोरग्राउंड',
      descriptionEn: 'Adaptive launcher icon vector foreground',
    },
    {
      path: 'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
      content: `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@android:color/holo_green_dark" />\n    <foreground android:drawable="@drawable/ic_launcher_foreground" />\n</adaptive-icon>\n`,
      descriptionHi: 'Adaptive लॉन्चर आइकन परिभाषा',
      descriptionEn: 'Adaptive launcher icon definition',
    },
  ];
}

export async function downloadAndroidProjectZip(config: AndroidProjectConfig): Promise<void> {
  const zip = new JSZip();
  const files = generateAndroidProjectFiles(config);
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `AshaManagement-v${config.versionName}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
