const express = require("express");
const path = require("path");
const multer = require("multer");
const cors = require("cors"); // Import the cors module
app.use(cors({ origin: "*" })); // Allow all origins
const {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

require("dotenv").config(); // Load environment variables

const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 * 1024 } });

const connectionString = process.env.AZURESTORAGECONNECTIONSTRING;
const accountName = process.env.AZURESTORAGEACCOUNTNAME;
const accountKey = process.env.AZURESTORAGEACCOUNTKEY;

if (!connectionString || !accountName || !accountKey) {
  console.error("❌ Azure Storage configuration is missing.");
  process.exit(1); // Stop the app if credentials are missing
}

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);

const containerName = "uploads";
const containerClient = blobServiceClient.getContainerClient(containerName);

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "❌ No file uploaded." });
  }

  try {
    console.log("🔹 Uploading:", req.file.originalname);

    const blobName = req.file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(req.file.buffer, req.file.size);

    // 🔹 Generate SAS Token
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24); // Set expiry to 24 hours

    const sasOptions = {
      containerName,
      blobName,
      expiresOn: expiryDate,
      permissions: BlobSASPermissions.parse("r"), // Read-only permission
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    const fileUrl = `${blockBlobClient.url}?${sasToken}`;

    console.log("File uploaded successfully:", fileUrl);
    res.json({ fileUrl });

  } catch (error) {
    console.error(" Upload error:", error);
    res.status(500).json({ message: " File upload failed.", error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
