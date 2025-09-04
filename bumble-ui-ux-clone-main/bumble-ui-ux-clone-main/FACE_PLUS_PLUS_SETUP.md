# Face++ AI Integration for Gender Detection

This project integrates Face++ API for real-time gender detection during face verification. The system automatically falls back to simulation mode if API credentials are not configured.

## Setting Up Face++ API

### 1. Create a Face++ Account
1. Go to [Face++ Console](https://console.faceplusplus.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Create an Application
1. After logging in, go to "Applications" in the console
2. Click "Create a new app"
3. Fill in the application details:
   - **App Name**: Bumble Clone Gender Detection
   - **Description**: Gender verification for dating app
   - **Platform**: Web Application
4. Click "Create"

### 3. Get Your API Credentials
1. After creating the app, you'll see your credentials:
   - **API Key**: Your public API key
   - **API Secret**: Your private API secret
2. Copy these credentials

### 4. Configure Environment Variables
1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual credentials:

```env
NEXT_PUBLIC_FACEPP_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FACEPP_API_SECRET=your_actual_api_secret_here
```

### 5. Restart Your Application
After updating the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

### API Integration
- **Real Detection**: When Face++ credentials are configured, the app captures a photo from the webcam and sends it to Face++ API for gender analysis
- **Fallback Mode**: If credentials are missing or API fails, the system automatically falls back to simulation mode
- **Error Handling**: Comprehensive error handling ensures the app continues working even if the API is temporarily unavailable

### Face++ API Features Used
- **Face Detection**: Detects if a face is present in the image
- **Gender Attribute**: Analyzes the detected face to determine gender (Male/Female)
- **High Accuracy**: Face++ provides professional-grade accuracy for gender detection

### Privacy & Security
- **No Data Storage**: Images are sent to Face++ for analysis but not stored
- **Secure Transmission**: All API calls use HTTPS encryption
- **Client-side Processing**: Image capture and preparation happens locally

## Free Tier Limits

Face++ offers a free tier with the following limits:
- **1,000 API calls per month**
- **Face Detection + Gender Analysis**: Each verification uses 1 API call
- **Rate Limiting**: Reasonable rate limits for development and testing

## Testing the Integration

1. **With API**: When properly configured, you'll see "🔗 Using Face++ AI API for real gender detection" in the verification interface
2. **Without API**: You'll see "⚠️ Face++ API not configured - using simulation mode"
3. **Error Handling**: If the API fails temporarily, the system will automatically fall back to simulation

## Production Considerations

For production deployment:

1. **Environment Variables**: Set environment variables on your hosting platform
2. **Rate Limiting**: Monitor your API usage to stay within limits
3. **Error Monitoring**: Implement logging to track API failures
4. **Backup Plans**: The simulation fallback ensures your app never breaks
5. **Cost Planning**: Consider upgrading to paid plans for higher API limits

## Troubleshooting

### Common Issues

1. **"API not configured" message**
   - Check that environment variables are set correctly
   - Restart the development server after changing .env.local

2. **API calls failing**
   - Verify your API credentials are correct
   - Check your Face++ account for remaining quota
   - Ensure your internet connection is stable

3. **CORS errors**
   - Face++ API supports cross-origin requests from web browsers
   - If you encounter CORS issues, check your API key permissions

### Testing API Credentials

You can test your Face++ credentials by making a simple API call:

```bash
curl -X POST "https://api-us.faceplusplus.com/facepp/v3/detect" \
  -F "api_key=YOUR_API_KEY" \
  -F "api_secret=YOUR_API_SECRET" \
  -F "image_url=https://example.com/face.jpg" \
  -F "return_attributes=gender"
```

## Alternative APIs

If Face++ doesn't meet your needs, the code can be easily adapted for other APIs:

- **Microsoft Azure Face API**
- **Amazon Rekognition**
- **Google Cloud Vision API**
- **Kairos Face Recognition**

The `analyzeGenderWithFacePlusPlus` function in `lib/facePlusPlus.ts` can be modified to work with any of these services.
