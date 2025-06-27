# 🛠️ Bedrock Dedicated Server Version Lookup API

A fast, reliable API service for retrieving the latest Minecraft Bedrock Dedicated Server (BDS) versions. Built with TypeScript, Express.js, and Puppeteer for accurate version detection through web scraping.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20API-blue?style=for-the-badge)](https://bds-version-lookup.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

## 🌟 Features

- **Multi-Platform Support**: Get versions for both Windows and Linux BDS
- **Preview & Stable Versions**: Access both stable and preview releases
- **Smart Caching**: 6-hour cache with background refresh for optimal performance
- **Real-time Scraping**: Uses Puppeteer to scrape official Minecraft website
- **RESTful API**: Clean, documented endpoints with comprehensive error handling
- **Health Monitoring**: Built-in health check and cache status endpoints
- **Fast Response Times**: Cached responses served instantly while refreshing in background

## 🚀 Live API

The API is live and running at: **https://bds-version-lookup.vercel.app/**

## 📖 API Documentation

### Base URL
```
https://bds-version-lookup.vercel.app/
```

### 🔍 Get Latest Version
```http
GET /version/:type/:preview
```

#### Parameters
| Parameter | Type | Required | Values | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | Yes | `win`, `linux` | Server platform type |
| `preview` | string | Yes | `true`, `false`, `1`, `0` | Whether to get preview version |

#### Response Format
```json
{
  "version": "1.21.84.1",
  "type": "win",
  "preview": false,
  "cached": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 📊 Cache Status
```http
GET /cache/status
```

View current cache status for all version combinations.

```json
{
  "cacheDurationMs": 21600000,
  "cacheDurationHours": 6,
  "entries": [
    {
      "type": "win",
      "preview": false,
      "cached": true,
      "version": "1.21.84.1"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 🏥 Health Check
```http
GET /health
```

Simple health check endpoint.

## 🛠️ Usage Examples

### JavaScript/Node.js
```javascript
// Get Windows stable version
const response = await fetch('https://bds-version-lookup.vercel.app/version/win/false');
const data = await response.json();
console.log(`Latest Windows BDS version: ${data.version}`);

// Get Linux preview version
const previewResponse = await fetch('https://bds-version-lookup.vercel.app/version/linux/true');
const previewData = await previewResponse.json();
console.log(`Latest Linux BDS preview: ${previewData.version}`);
```

### Python
```python
import requests

# Get Windows stable version
response = requests.get('https://bds-version-lookup.vercel.app/version/win/false')
data = response.json()
print(f"Latest Windows BDS version: {data['version']}")
```

### cURL
```bash
# Get Windows stable version
curl https://bds-version-lookup.vercel.app/version/win/false

# Get Linux preview version
curl https://bds-version-lookup.vercel.app/version/linux/true

# Check cache status
curl https://bds-version-lookup.vercel.app/cache/status
```

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bds-version-lookup.git
   cd bds-version-lookup
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

The API will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
bds-version-lookup/
├── src/
│   ├── index.ts      # Main Express server and API routes
│   ├── utils.ts      # Core scraping logic and cache management
│   ├── config.ts     # Configuration constants
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── vercel.json       # Vercel deployment config
└── README.md         # This file
```

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)

### Cache Settings
- **Duration**: 6 hours
- **Strategy**: Background refresh (serves cached data while refreshing)
- **Coverage**: All platform/version combinations

## 🚀 Deployment

### Vercel (Recommended)
This project is optimized for Vercel deployment:

1. Fork this repository
2. Connect your GitHub account to Vercel
3. Import the project
4. Deploy automatically

### Other Platforms
The API can be deployed on any Node.js hosting platform:
- Railway
- Heroku
- DigitalOcean App Platform
- AWS Lambda (with serverless framework)

## 🔍 How It Works

1. **Web Scraping**: Uses Puppeteer to navigate to the official Minecraft BDS download page
2. **Dynamic Interaction**: Simulates user clicks on radio buttons and EULA acceptance
3. **Version Extraction**: Parses download URLs to extract version numbers
4. **Smart Caching**: Implements background refresh to serve fast responses
5. **Error Handling**: Comprehensive error handling with meaningful messages

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Add appropriate error handling
- Update documentation for new features
- Test your changes locally before submitting

## 📝 API Rate Limits

- No authentication required
- No rate limits currently implemented
- Cached responses ensure minimal load on source servers
- Please use responsibly

## 🐛 Known Issues & Limitations

- Depends on Minecraft.net website structure (may break if site changes)
- Preview versions may not always be available
- Puppeteer requires specific browser dependencies in some environments

## 📜 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Minecraft.net](https://minecraft.net) for providing the official BDS downloads
- [Puppeteer](https://pptr.dev/) for reliable web scraping capabilities
- [Express.js](https://expressjs.com/) for the robust web framework
- [Vercel](https://vercel.com/) for seamless deployment platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/bds-version-lookup/issues)
- **API Status**: Check `/health` endpoint
- **Cache Status**: Check `/cache/status` endpoint

---

**Made with ❤️ for the Minecraft Bedrock community**

*If you find this API useful, please consider giving it a ⭐ on GitHub!* 