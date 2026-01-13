// Test file with various secrets for CLI testing
const config = {
    // Real-looking AWS key
    awsAccessKey: "AKIAIOSFODNN7EXAMPLE",

    // GitHub token
    githubToken: "ghp_1234567890abcdefghijklmnopqrstuv",

    // Google API key
    googleApiKey: "AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe",

    // Stripe live key (CRITICAL)
    stripeKey: "sk_live_51234567890abcdefghijklmnop",

    // Database connection
    dbUrl: "mongodb://admin:SuperSecret123@localhost:27017/mydb",

    // JWT token
    jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
};

// This should be flagged as test
const test_key = "AKIATEST1234EXAMPLE";

// Production key (should be flagged)
const prod_api_key = "sk_live_realproductionkey123456789";

module.exports = config;
