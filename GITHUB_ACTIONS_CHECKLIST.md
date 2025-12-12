# ✅ GitHub Actions Setup - Complete Checklist

## 🎯 What Was Created

### GitHub Workflows

1. **`.github/workflows/lint.yml`** - ESLint quality check
2. **`.github/workflows/format.yml`** - Prettier formatting check

### Configuration Files

1. **`.eslintrc.json`** - ESLint configuration
2. **`.prettierrc.json`** - Prettier configuration
3. **`package.json`** - Updated with eslint and prettier as devDependencies

---

## 📋 Step-by-Step Checklist

### Step 1: Install Dependencies

```bash
npm install
```

This installs ESLint and Prettier that were added to your `package.json`.

---

### Step 2: Test Locally (Before Pushing)

#### Test ESLint:

```bash
npx eslint .
```

- ✅ Should check all JavaScript files
- ❌ If errors found, fix them or they'll fail in CI

#### Test Prettier:

```bash
npx prettier --check "**/*.{js,jsx,ts,tsx,json,md}"
```

- ✅ Should check all supported files
- ❌ If formatting issues found, auto-fix with:

```bash
npx prettier --write "**/*.{js,jsx,ts,tsx,json,md}"
```

---

### Step 3: Commit and Push

#### **Option A: You're Already on Main Branch**

```bash
# Add all new files
git add .github/ .eslintrc.json .prettierrc.json package.json package-lock.json

# Commit
git commit -m "feat: Add GitHub Actions for linting and formatting"

# Push to main
git push origin main
```

#### **Option B: Use a Feature Branch (Recommended)**

```bash
# Create a new branch
git checkout -b setup/github-actions

# Add all new files
git add .github/ .eslintrc.json .prettierrc.json package.json package-lock.json

# Commit
git commit -m "feat: Add GitHub Actions for linting and formatting"

# Push to remote
git push origin setup/github-actions

# Then create a Pull Request on GitHub
```

---

### Step 4: Test the Workflows

#### Testing via Pull Request (Recommended):

1. **Create a PR** from your feature branch to `main`
2. GitHub Actions will automatically run:
   - ✅ ESLint workflow (lint.yml)
   - ✅ Prettier workflow (format.yml)
3. Check the **"Checks"** tab in your PR
4. Both workflows should show **green checkmarks** ✅

#### Testing via Push to Main:

1. Push directly to `main` branch
2. Go to **Actions** tab in GitHub repository
3. Click on the latest workflow run
4. Verify both workflows passed

---

### Step 5: Verify Workflow Files

Check that workflows exist:

```bash
ls -la .github/workflows/
```

You should see:

- `lint.yml`
- `format.yml`

---

## 🔍 Brownie Challenge Requirements - Verification

### ✅ Requirement 1: Workflows in `.github/workflows/`

- **lint.yml** - ✅ Created
- **format.yml** - ✅ Created

### ✅ Requirement 2: Trigger on `pull_request` and `push` to `main`

Both workflows have:

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
```

### ✅ Requirement 3: Use Node.js 18 (LTS)

Both workflows use:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '18'
```

### ✅ Requirement 4: Install dependencies with `npm install`

Both workflows include:

```yaml
- run: npm install
```

### ✅ Requirement 5: Fail on errors

- **ESLint**: `npx eslint .` exits with code 1 on errors
- **Prettier**: `npx prettier --check` exits with code 1 on formatting issues

### ✅ Requirement 6: Latest stable GitHub Actions

- `actions/checkout@v4` ✅
- `actions/setup-node@v4` ✅

---

## 🚨 Common Issues & Fixes

### Issue 1: ESLint Errors

```bash
# View errors
npx eslint .

# Auto-fix some errors
npx eslint . --fix
```

### Issue 2: Prettier Formatting Issues

```bash
# Check formatting issues
npx prettier --check "**/*.{js,jsx,ts,tsx,json,md}"

# Auto-fix formatting
npx prettier --write "**/*.{js,jsx,ts,tsx,json,md}"
```

### Issue 3: Workflow Not Running

- Ensure you pushed the `.github/workflows/` folder
- Check GitHub Actions tab is enabled in repository settings
- Verify workflow syntax at: https://www.yamllint.com/

### Issue 4: Node Modules Missing in CI

- Ensure `package.json` includes `eslint` and `prettier` in `devDependencies`
- Commit the updated `package-lock.json`

---

## 📊 Expected Workflow Behavior

### On Pull Request:

1. Developer creates PR from feature branch → main
2. GitHub triggers both workflows
3. **lint.yml** runs ESLint on codebase
4. **format.yml** runs Prettier check
5. If both pass → PR shows ✅ "All checks passed"
6. If either fails → PR shows ❌ "Some checks failed"

### On Push to Main:

1. Code pushed/merged to main branch
2. Both workflows run automatically
3. Results visible in **Actions** tab
4. Email notification if workflow fails

---

## 🎓 Quick Commands Reference

```bash
# Install dependencies
npm install

# Run linter locally
npx eslint .

# Fix linting issues
npx eslint . --fix

# Check formatting
npx prettier --check "**/*.{js,jsx,ts,tsx,json,md}"

# Fix formatting
npx prettier --write "**/*.{js,jsx,ts,tsx,json,md}"

# Test workflows locally (requires act)
act pull_request
```

---

## ✅ Final Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] ESLint runs without errors (`npx eslint .`)
- [ ] Prettier check passes (`npx prettier --check "**/*.{js,jsx,ts,tsx,json,md}"`)
- [ ] Workflow files exist in `.github/workflows/`
- [ ] Files committed and pushed to GitHub
- [ ] Pull Request created (or pushed to main)
- [ ] GitHub Actions tab shows workflow runs
- [ ] Both workflows show green checkmarks ✅

---

## 🎉 Success Criteria

**Your setup is complete when:**

1. ✅ Both workflow files exist in `.github/workflows/`
2. ✅ ESLint workflow runs on PR/push and passes
3. ✅ Prettier workflow runs on PR/push and passes
4. ✅ Workflow failures are visible in PR checks
5. ✅ Actions tab shows successful workflow runs

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [actions/checkout@v4](https://github.com/actions/checkout)
- [actions/setup-node@v4](https://github.com/actions/setup-node)

---

**Need help?** Run `git status` to see what files are ready to commit!
