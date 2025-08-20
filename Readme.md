# Rx11y: Accessibility for Reactive Forms

Rx11y (pronounced "Rx-ally") is a lightweight library and backend service designed to enhance the accessibility of reactive forms and provide automated accessibility testing via API endpoints. This project includes an Express.js backend with Firestore integration and Docker support.

---

## Features

*   **Automatic `aria-describedby`:** Seamlessly links form controls to their error messages, providing screen readers with crucial context.
*   **`aria-labelledby` for complex labels:** Simplifies associating controls with multiple label elements.
*   **Dynamic `aria-live` regions:** Manages the announcement of form validation changes to assistive technologies.
*   **Type-safe API:** Built with TypeScript for a robust and predictable development experience.
*   **Minimalistic and performant:** Designed to be lightweight and not impact application performance.
*   **REST API for Accessibility Testing:** Run accessibility tests and store results in Firestore.

---

## Installation (Backend)

Clone the repository and install dependencies:

```bash
npm install
```

---

## Running Locally

1.  **Firebase Setup:**

    *   Go to firebase projects, create a new project or select an existing one then project settings.
    *   sevice accounts > create service account >` Generate new private key`.
    *   Create a Firebase project and generate a service account key (`servicekey.json`).
    *   Place `servicekey.json` in the project root.

2.  **Start the server:**

    ```bash
    node server.js
    # or
    npm start
    ```
    The server will run on `http://localhost:8080` by default.

---

## Docker Usage

### Build the Docker image

```bash
docker build -t rx11y-backend .
```

### Run the Docker container locally (with service account key)

```bash
docker run -p 5000:5000 -v $(pwd)/servicekey.json:/app/servicekey.json rx11y-backend
```

---

## Deploying to Google Cloud Run

*   The Dockerfile is ready for Cloud Run. Deploy using:

    ```bash
    gcloud run deploy --source .
    ```

*   Cloud Run will use Workload Identity for authentication; no key file is needed in the image.

---

## API Documentation

All endpoints are prefixed with `/api`.

### POST `/api/testFirestore`

Test Firestore connectivity.

*   **Response:** `{ success, message, documentId }`

### POST `/api/runAccessibilityTest`

Run a Pa11y accessibility test and save the report to Firestore.

*   **Body:** `{ url: string, testId: string }`
*   **Response:** `{ testId, summary: { total, errors, warnings, notices } }`

### GET `/api/reports`

Get a list of local JSON reports (from the `reports` directory).

*   **Response:** `Array<ReportSummary>`

### GET `/api/reports/:id`

Get a specific local JSON report by ID.

*   **Response:** `Report`

### POST `/api/generateModifiedHtmlForTest`

Generate and update modified HTML for a test by `testId`.

*   **Body:** `{ testId: string }`
*   **Response:** `{ success, message, testId, modifiedHtml }`

---

## Environment Variables

*   `PORT` (optional): Port to run the server (default: 5000)
*   `GOOGLE_APPLICATION_CREDENTIALS` (optional for local): Path to your Firebase service account key

---

## License

MIT
