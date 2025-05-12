package com.storefrontapp;

import android.os.Bundle;
import android.webkit.WebView;
import android.widget.ImageButton;
import androidx.appcompat.app.AppCompatActivity;
import androidx.drawerlayout.widget.DrawerLayout;
import com.google.android.material.navigation.NavigationView;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private DrawerLayout drawerLayout;
    private static final String BASE_URL = "http://your-server-url:3000"; // Change this to your server URL

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize WebView
        webView = findViewById(R.id.webview);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebViewClient(new CustomWebViewClient());
        webView.loadUrl(BASE_URL);

        // Initialize DrawerLayout
        drawerLayout = findViewById(R.id.drawer_layout);
        NavigationView navigationView = findViewById(R.id.nav_view);

        // Setup hidden menu button
        ImageButton menuButton = findViewById(R.id.menuButton);
        menuButton.setOnClickListener(v -> drawerLayout.open());

        // Setup navigation drawer
        navigationView.setNavigationItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_add_store) {
                webView.loadUrl(BASE_URL + "/create-store");
            } else if (id == R.id.nav_account) {
                webView.loadUrl(BASE_URL + "/dashboard");
            }
            drawerLayout.close();
            return true;
        });
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
} 