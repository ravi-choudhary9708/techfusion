# Publishing to npm - Step-by-Step Guide

## Prerequisites Completed ✅

- ✅ package.json updated with metadata
- ✅ README.md created
- ✅ LICENSE file added (MIT)
- ✅ .npmignore configured

## Publishing Steps

### **Step 1: Create npm Account** (If you haven't already)

1. Go to https://www.npmjs.com/signup
2. Fill in:
   - Username
   - Email
   - Password
3. Verify your email

### **Step 2: Update package.json with Your Info**

Open `package.json` and update these fields:

```json
{
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "url": "https://github.com/YOUR_USERNAME/secretAnalyzer.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/secretAnalyzer/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/secretAnalyzer#readme"
}
```

Replace:
- `Your Name` with your actual name
- `your.email@example.com` with your email
- `YOUR_USERNAME` with your GitHub username

### **Step 3: Update README.md**

Open `README.md` and update:
- Author name in license section
- Email in support section
- GitHub URLs

### **Step 4: Login to npm**

Open terminal and run:

```bash
npm login
```

Enter:
- Username
- Password
- Email
- One-time password (if 2FA enabled)

You should see: `Logged in as YOUR_USERNAME on https://registry.npmjs.org/`

### **Step 5: Check Package Name Availability**

```bash
npm search secret-scan-cli
```

If nothing shows up, the name is available! ✅

If taken, update `package.json`:
```json
{
  "name": "@your-username/secret-scan",
}
```

### **Step 6: Build the CLI**

```bash
npm run build:cli
```

This creates the `dist/` folder with compiled JavaScript.

Verify the build:
```bash
ls dist/cli/
```

You should see `scan.js`

### **Step 7: Test Locally Before Publishing**

```bash
npm link
```

This creates a global symlink. Now test:

```bash
secret-scan test-files/sample-secrets.js
```

If it works, you're ready to publish! 🎉

### **Step 8: Publish to npm**

**Dry run first (recommended):**
```bash
npm publish --dry-run
```

**Actual publish:**
If you have 2FA enabled on your npm account (standard for new accounts), run:
```bash
npm publish --otp=YOUR_CODE
```
*(Note the **double dashes** `--otp`. Replace `YOUR_CODE` with the 6-digit code from your authenticator app)*

If you don't have 2FA, just run:
```bash
npm publish
```

You should see:
```
+ secret-scan-cli@1.0.0
```

### **Step 9: Verify Publication**

1. Go to https://www.npmjs.com/package/secret-scan-cli
2. You should see your package!

### **Step 10: Test Installation**

In a different directory:

```bash
npm install -g secret-scan-cli
secret-scan --version
```

Should output: `1.0.0`

## Congratulations! 🎉

Your CLI is now published and anyone can install it with:

```bash
npm install -g secret-scan-cli
```

## Updating Your Package

When you make changes:

1. Update version in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Or use npm version:
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```

3. Rebuild and publish:
   ```bash
   npm run build:cli
   npm publish
   ```

## Troubleshooting

### Error: "403 Forbidden - Two-factor authentication required"

This is a security feature. You need to provide your 2FA code (from your authenticator app) during publish using **double dashes**.

**Solution:**
```bash
npm publish --otp=123456
```
*(Replace `123456` with the code from your phone)*


- Make sure you're logged in: `npm whoami`
- Package name might be taken, try a different name

### Error: "You must verify your email"

- Check your email and click the verification link
- Or go to https://www.npmjs.com/settings/profile

### Error: "Package name too similar to existing package"

- Choose a more unique name
- Use scoped package: `@your-username/secret-scan`

### Build fails

- Make sure TypeScript is installed: `npm install -D typescript`
- Check for syntax errors in `cli/scan.ts`

## Best Practices

1. **Semantic Versioning**
   - MAJOR: Breaking changes (2.0.0)
   - MINOR: New features (1.1.0)
   - PATCH: Bug fixes (1.0.1)

2. **Changelog**
   - Keep a CHANGELOG.md
   - Document all changes

3. **Testing**
   - Always test with `npm link` before publishing
   - Test on different operating systems if possible

4. **Documentation**
   - Keep README.md up to date
   - Add examples for new features

## Quick Reference

```bash
# Login
npm login

# Check who you're logged in as
npm whoami

# Build
npm run build:cli

# Test locally
npm link

# Dry run
npm publish --dry-run

# Publish
npm publish

# Update version
npm version patch

# Unpublish (within 72 hours)
npm unpublish secret-scan-cli@1.0.0
```

## Next Steps After Publishing

1. **Add npm badge to README**
   ```markdown
   [![npm version](https://badge.fury.io/js/secret-scan-cli.svg)](https://www.npmjs.com/package/secret-scan-cli)
   ```

2. **Share on social media**
   - Twitter/X
   - LinkedIn
   - Reddit (r/node, r/javascript)

3. **Add to GitHub**
   - Push to GitHub
   - Add topics: cli, security, secrets, scanner

4. **Monitor downloads**
   - Check https://www.npmjs.com/package/secret-scan-cli
   - View download stats

Good luck! 🚀
