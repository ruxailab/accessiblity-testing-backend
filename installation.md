# Local Setup Instructions

## 1. Install Dependencies

```bash
npm install
```

## 2. Obtain Firebase Service Key

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Click the gear icon next to "Project Overview" and select **Project settings**.
4. Go to the **Service accounts** tab.
5. Click **Generate new private key** under the Firebase Admin SDK section.
6. Download the JSON file.
7. Rename the downloaded file to `servicekey.json` and place it in the project root directory.

## 3. Configure `server.js` for Local Development

- Open `server.js`.
- Uncomment the following lines:

```javascript
const serviceAccount = require('./servicekey.json');
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});
```

- Comment out the production initialization:

```javascript
// admin.initializeApp({
//     credential: admin.credential.applicationDefault(),
// });
```

## 4. Start the Server

```bash
npm start
```

## 5. NOTE: IMPORTANT 

when deploying it to gcp use the production initialization by commenting out the production 
and locally use local code (which is set by default)
