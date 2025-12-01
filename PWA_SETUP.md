# PWA Setup Guide

Your Jindagi app is now configured as a Progressive Web App (PWA)! 🎉

## What's Been Set Up

1. ✅ **PWA Package**: Installed `@ducanh2912/next-pwa` for Next.js 14 compatibility
2. ✅ **Web App Manifest**: Created `public/manifest.json` with app metadata
3. ✅ **Service Worker**: Automatically generated on build (disabled in development)
4. ✅ **PWA Meta Tags**: Added to `app/layout.tsx` for iOS and Android support

## Generating Icons

To complete the PWA setup, you need to generate PNG icon files:

### Option 1: Use the HTML Generator (Easiest)

1. Open `public/generate-png-icons.html` in your browser
2. Click the "Download" buttons to save the PNG icons
3. Place the downloaded files in the `public` folder:
   - `icon-192x192.png`
   - `icon-512x512.png`

### Option 2: Convert SVG to PNG

SVG icons have been generated in the `public` folder. Convert them to PNG using:

- **Online**: https://cloudconvert.com/svg-to-png
- **Command line** (if you have ImageMagick):
  ```bash
  convert public/icon-192x192.svg public/icon-192x192.png
  convert public/icon-512x512.svg public/icon-512x512.png
  ```

### Option 3: Create Custom Icons

Replace the generated icons with your own custom designs:
- Minimum sizes: 192x192 and 512x512 pixels
- Format: PNG with transparency support
- Place in: `public/icon-192x192.png` and `public/icon-512x512.png`

## Testing Your PWA

### Development Mode

PWA features are **disabled in development** for faster builds. To test:

1. Build the production version:
   ```bash
   pnpm build
   pnpm start
   ```

2. Open Chrome DevTools → Application → Manifest to verify

### Production Testing

1. Deploy your app to a server with HTTPS (required for PWA)
2. Open in Chrome/Edge and look for the install prompt
3. Or use Chrome DevTools → Lighthouse → Generate report → PWA audit

## Features Enabled

- ✅ **Offline Support**: Service worker caches app resources
- ✅ **Install Prompt**: Users can install the app on their devices
- ✅ **App-like Experience**: Standalone display mode
- ✅ **Fast Navigation**: Aggressive caching for instant page loads
- ✅ **Auto-update**: Service worker updates automatically

## Customization

### Update App Name/Colors

Edit `public/manifest.json`:
- `name`: Full app name
- `short_name`: Short name for home screen
- `theme_color`: Browser theme color
- `background_color`: Splash screen background

### Update Icons

Replace the icon files in `public/` and update `manifest.json` if needed.

## Troubleshooting

### Service Worker Not Registering

- Ensure you're testing on HTTPS (or localhost)
- Check browser console for errors
- Verify `next.config.mjs` is correctly configured

### Icons Not Showing

- Ensure PNG files exist in `public/` folder
- Check file names match `manifest.json`
- Clear browser cache and reload

### Build Errors

- Make sure `@ducanh2912/next-pwa` is installed
- Check `next.config.mjs` syntax
- Try deleting `.next` folder and rebuilding

## Next Steps

1. Generate PNG icons using one of the methods above
2. Test the PWA in production build
3. Customize the manifest and icons to match your brand
4. Deploy to a server with HTTPS
5. Test installation on mobile devices

Enjoy your new PWA! 🚀

