package com.syllablebattle.deckmaster;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

public class MainActivity extends AppCompatActivity {
    private static final String APP_VERSION_PATH = "app-version.json";
    private static final long MIN_LOADING_DURATION_MS = 2500L;
    private static final String WEBVIEW_REFRESH_PARAM = "wv_refresh";
    private static final int MAX_VERSION_SYNC_ATTEMPTS = 2;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private View loadingOverlay;
    private TextView loadingMessageView;
    private String remoteWebUrl;
    private String remoteWebHost;
    private String latestAvailableBuild;
    private int versionSyncAttemptCount;
    private long loadingVisibleSinceMs;
    private Runnable pendingHideOverlay;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        super.onCreate(savedInstanceState);

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        remoteWebUrl = getString(R.string.remote_web_url);
        remoteWebHost = getString(R.string.remote_web_host);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setBackgroundColor(Color.BLACK);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        configureWebView(webView);
        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.BLACK);
        rootLayout.addView(webView);
        loadingOverlay = createLoadingOverlay();
        loadingVisibleSinceMs = SystemClock.elapsedRealtime();
        rootLayout.addView(loadingOverlay);
        setContentView(rootLayout);
        enterImmersiveMode();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });

        refreshForLatestBuild("Preparando a arena magica...");
    }

    private void configureWebView(WebView view) {
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(view, true);

        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
        } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }

        view.setWebChromeClient(new WebChromeClient());
        view.setWebViewClient(new RemoteOnlyWebViewClient());
    }

    private void enterImmersiveMode() {
        View decorView = getWindow().getDecorView();
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), decorView);
        if (controller == null) {
            return;
        }
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        controller.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
    }

    private View createLoadingOverlay() {
        FrameLayout overlay = new FrameLayout(this);
        overlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        GradientDrawable overlayBackground = new GradientDrawable();
        overlayBackground.setColor(getColor(R.color.spellcast_loading_back_panel));
        overlay.setBackground(overlayBackground);
        overlay.setClickable(true);
        overlay.setFocusable(true);

        FrameLayout panel = new FrameLayout(this);

        FrameLayout.LayoutParams panelLayoutParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
        );
        panelLayoutParams.leftMargin = dpToPx(6);
        panelLayoutParams.topMargin = dpToPx(6);
        panelLayoutParams.rightMargin = dpToPx(6);
        panelLayoutParams.bottomMargin = dpToPx(6);
        panel.setLayoutParams(panelLayoutParams);

        GradientDrawable panelBackground = new GradientDrawable();
        panelBackground.setCornerRadius(dpToPx(26));
        panelBackground.setColor(getColor(R.color.spellcast_loading_panel));
        panelBackground.setStroke(dpToPx(2), getColor(R.color.spellcast_loading_panel_border));
        panel.setBackground(panelBackground);
        panel.setElevation(dpToPx(10));
        panel.setClipToOutline(true);

        View outerTextureOverlay = new View(this);
        outerTextureOverlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        outerTextureOverlay.setBackgroundResource(R.drawable.spellcast_loading_paper_texture);
        outerTextureOverlay.setAlpha(0.48f);
        panel.addView(outerTextureOverlay);

        FrameLayout panelContent = new FrameLayout(this);
        panelContent.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        FrameLayout innerFrame = new FrameLayout(this);
        FrameLayout.LayoutParams innerFrameLayoutParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        innerFrameLayoutParams.leftMargin = dpToPx(8);
        innerFrameLayoutParams.topMargin = dpToPx(8);
        innerFrameLayoutParams.rightMargin = dpToPx(8);
        innerFrameLayoutParams.bottomMargin = dpToPx(8);
        innerFrame.setLayoutParams(innerFrameLayoutParams);
        GradientDrawable innerFrameBackground = new GradientDrawable();
        innerFrameBackground.setCornerRadius(dpToPx(22));
        innerFrameBackground.setColor(getColor(R.color.spellcast_loading_panel_inner));
        innerFrameBackground.setStroke(dpToPx(1), getColor(R.color.spellcast_loading_panel_inner_border));
        innerFrame.setBackground(innerFrameBackground);
        innerFrame.setClipToOutline(true);

        View textureOverlay = new View(this);
        textureOverlay.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        textureOverlay.setBackgroundResource(R.drawable.spellcast_loading_paper_texture);
        textureOverlay.setAlpha(0.52f);
        innerFrame.addView(textureOverlay);

        panelContent.addView(innerFrame);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        content.setPadding(dpToPx(22), dpToPx(18), dpToPx(22), dpToPx(18));
        content.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        innerFrame.addView(content);

        ImageView crestView = new ImageView(this);
        LinearLayout.LayoutParams crestLayoutParams = new LinearLayout.LayoutParams(dpToPx(110), dpToPx(110));
        crestView.setLayoutParams(crestLayoutParams);
        crestView.setImageResource(R.mipmap.ic_launcher);
        crestView.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable crestBackground = new GradientDrawable();
        crestBackground.setShape(GradientDrawable.OVAL);
        crestBackground.setColor(getColor(R.color.spellcast_loading_gold));
        crestBackground.setStroke(dpToPx(3), getColor(R.color.spellcast_loading_gold_dark));
        crestView.setBackground(crestBackground);
        crestView.setPadding(dpToPx(10), dpToPx(10), dpToPx(10), dpToPx(10));

        TextView titleView = new TextView(this);
        LinearLayout.LayoutParams titleLayoutParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleLayoutParams.topMargin = dpToPx(20);
        titleView.setLayoutParams(titleLayoutParams);
        titleView.setText("SpellCast");
        titleView.setTextColor(getColor(R.color.spellcast_loading_title));
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 32);
        titleView.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        titleView.setGravity(Gravity.CENTER);

        loadingMessageView = new TextView(this);
        LinearLayout.LayoutParams messageLayoutParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        messageLayoutParams.topMargin = dpToPx(12);
        loadingMessageView.setLayoutParams(messageLayoutParams);
        loadingMessageView.setTextColor(getColor(R.color.spellcast_loading_badge_text));
        loadingMessageView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        loadingMessageView.setTypeface(Typeface.DEFAULT_BOLD);
        loadingMessageView.setLetterSpacing(0.02f);
        loadingMessageView.setGravity(Gravity.CENTER);

        ProgressBar progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        LinearLayout.LayoutParams progressLayoutParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dpToPx(10)
        );
        progressLayoutParams.topMargin = dpToPx(26);
        progressBar.setLayoutParams(progressLayoutParams);
        progressBar.setIndeterminate(true);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.spellcast_loading_gold_dark)));
        progressBar.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.spellcast_loading_gold_dark)));
        GradientDrawable progressBackground = new GradientDrawable();
        progressBackground.setCornerRadius(dpToPx(999));
        progressBackground.setColor(adjustAlpha(getColor(R.color.spellcast_loading_gold), 0.35f));
        progressBar.setBackground(progressBackground);
        View topSpacer = new View(this);
        topSpacer.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));
        View bottomSpacer = new View(this);
        bottomSpacer.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));

        content.addView(topSpacer);
        content.addView(crestView);
        content.addView(titleView);
        content.addView(loadingMessageView);
        content.addView(progressBar);
        content.addView(bottomSpacer);

        panel.addView(panelContent);
        overlay.addView(panel);
        return overlay;
    }

    private int dpToPx(int value) {
        return Math.round(
                TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP,
                        value,
                        getResources().getDisplayMetrics()
                )
        );
    }

    private int adjustAlpha(int color, float factor) {
        int alpha = Math.round(Color.alpha(color) * factor);
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
    }

    private void setLoadingMessage(String message) {
        if (loadingMessageView != null) {
            loadingMessageView.setText(message);
        }
    }

    private void showLoadingOverlay(String message) {
        setLoadingMessage(message);
        if (pendingHideOverlay != null) {
            mainHandler.removeCallbacks(pendingHideOverlay);
            pendingHideOverlay = null;
        }
        if (loadingOverlay != null) {
            if (loadingOverlay.getVisibility() != View.VISIBLE) {
                loadingVisibleSinceMs = SystemClock.elapsedRealtime();
            }
            loadingOverlay.setVisibility(View.VISIBLE);
            loadingOverlay.bringToFront();
        }
    }

    private void hideLoadingOverlay() {
        if (loadingOverlay == null) {
            return;
        }

        long elapsed = SystemClock.elapsedRealtime() - loadingVisibleSinceMs;
        long remaining = MIN_LOADING_DURATION_MS - elapsed;
        if (remaining <= 0L) {
            loadingOverlay.setVisibility(View.GONE);
            return;
        }

        if (pendingHideOverlay != null) {
            mainHandler.removeCallbacks(pendingHideOverlay);
        }

        pendingHideOverlay = () -> {
            if (loadingOverlay != null) {
                loadingOverlay.setVisibility(View.GONE);
            }
            pendingHideOverlay = null;
        };
        mainHandler.postDelayed(pendingHideOverlay, remaining);
    }

    private String buildVersionUrl() {
        String normalizedRemoteUrl = remoteWebUrl.endsWith("/") ? remoteWebUrl : remoteWebUrl + "/";
        return normalizedRemoteUrl + APP_VERSION_PATH + "?" + WEBVIEW_REFRESH_PARAM + "=" + System.currentTimeMillis();
    }

    private String buildLaunchUrl() {
        Uri baseUri = Uri.parse(remoteWebUrl);
        return baseUri.buildUpon()
                .appendQueryParameter(WEBVIEW_REFRESH_PARAM, String.valueOf(System.currentTimeMillis()))
                .build()
                .toString();
    }

    private void refreshForLatestBuild(String loadingMessage) {
        showLoadingOverlay(loadingMessage);
        fetchLatestBuildVersion();
    }

    private void fetchLatestBuildVersion() {
        Thread versionThread = new Thread(() -> {
            String fetchedBuild = null;
            try {
                java.net.URL requestUrl = new java.net.URL(buildVersionUrl());
                java.net.HttpURLConnection connection =
                        (java.net.HttpURLConnection) requestUrl.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setUseCaches(false);
                connection.setRequestProperty("Cache-Control", "no-cache, no-store, max-age=0");
                connection.setRequestProperty("Pragma", "no-cache");
                connection.connect();

                int statusCode = connection.getResponseCode();
                if (statusCode >= 200 && statusCode < 300) {
                    java.io.InputStream inputStream = connection.getInputStream();
                    java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
                    byte[] buffer = new byte[1024];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    inputStream.close();
                    fetchedBuild = parseBuildFromVersionPayload(outputStream.toString(java.nio.charset.StandardCharsets.UTF_8));
                    outputStream.close();
                }
                connection.disconnect();
            } catch (Exception ignored) {
                fetchedBuild = null;
            }

            String resolvedBuild = fetchedBuild;
            mainHandler.post(() -> {
                latestAvailableBuild = resolvedBuild;
                versionSyncAttemptCount = 0;
                webView.loadUrl(buildLaunchUrl());
            });
        }, "spellcast-version-fetch");
        versionThread.start();
    }

    private String parseBuildFromVersionPayload(String payload) {
        if (payload == null) {
            return null;
        }

        String marker = "\"build\"";
        int markerIndex = payload.indexOf(marker);
        if (markerIndex < 0) {
            return null;
        }

        int colonIndex = payload.indexOf(':', markerIndex + marker.length());
        if (colonIndex < 0) {
            return null;
        }

        int openingQuoteIndex = payload.indexOf('"', colonIndex + 1);
        if (openingQuoteIndex < 0) {
            return null;
        }

        int closingQuoteIndex = payload.indexOf('"', openingQuoteIndex + 1);
        if (closingQuoteIndex < 0) {
            return null;
        }

        return payload.substring(openingQuoteIndex + 1, closingQuoteIndex);
    }

    private void verifyLoadedBuildVersion() {
        if (webView == null) {
            hideLoadingOverlay();
            return;
        }

        webView.evaluateJavascript(
                "(function(){return window.__SPELLCAST_BUILD__ || document.documentElement.getAttribute('data-app-build') || '';})();",
                value -> {
                    String loadedBuild = normalizeJavascriptResult(value);
                    boolean buildKnown = latestAvailableBuild != null && !latestAvailableBuild.isEmpty();
                    boolean buildMatches = buildKnown && latestAvailableBuild.equals(loadedBuild);

                    if (!buildKnown || buildMatches) {
                        versionSyncAttemptCount = 0;
                        hideLoadingOverlay();
                        return;
                    }

                    if (versionSyncAttemptCount < MAX_VERSION_SYNC_ATTEMPTS) {
                        versionSyncAttemptCount += 1;
                        showLoadingOverlay("Preparando a arena magica...");
                        webView.loadUrl(buildLaunchUrl());
                        return;
                    }

                    hideLoadingOverlay();
                }
        );
    }

    private String normalizeJavascriptResult(String value) {
        if (value == null || "null".equals(value)) {
            return "";
        }

        String normalizedValue = value;
        if (normalizedValue.startsWith("\"") && normalizedValue.endsWith("\"") && normalizedValue.length() >= 2) {
            normalizedValue = normalizedValue.substring(1, normalizedValue.length() - 1);
        }

        return normalizedValue.replace("\\u003C", "<").replace("\\n", "\n").replace("\\\"", "\"");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
        enterImmersiveMode();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enterImmersiveMode();
        }
    }

    @Override
    protected void onDestroy() {
        if (pendingHideOverlay != null) {
            mainHandler.removeCallbacks(pendingHideOverlay);
            pendingHideOverlay = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private boolean isInternalUrl(Uri uri) {
        String host = uri.getHost();
        return host != null && host.equalsIgnoreCase(remoteWebHost);
    }

    private void openExternal(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        startActivity(intent);
    }

    private final class RemoteOnlyWebViewClient extends WebViewClient {
        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            verifyLoadedBuildVersion();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isInternalUrl(uri)) {
                return false;
            }
            openExternal(uri);
            return true;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (isInternalUrl(uri)) {
                return false;
            }
            openExternal(uri);
            return true;
        }
    }
}
