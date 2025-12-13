# 🔒 Branch Protection Setup Guide

## Enable Branch Protection for `main`

### Step 1: Go to Repository Settings

1. Navigate to your GitHub repository: https://github.com/Sahil-dev-2005/CompliBot
2. Click **Settings** (top right)
3. Click **Branches** (left sidebar under "Code and automation")

### Step 2: Add Branch Protection Rule

1. Click **"Add branch protection rule"** button
2. In **"Branch name pattern"**, enter: `main`

### Step 3: Configure Protection Rules

**Required Settings:**

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `0` or `1` (your choice)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Search and select these status checks:
    - `ESLint` (from lint.yml)
    - `Prettier` (from format.yml)
    - `Quality Gate` (from ci.yml)

**Optional but Recommended:**

- ✅ **Require conversation resolution before merging**
- ✅ **Do not allow bypassing the above settings**

**Leave Unchecked:**

- ❌ Require signed commits (unless you use GPG)
- ❌ Require linear history (can cause issues)
- ❌ Lock branch (makes it read-only)

### Step 4: Save Changes

Click **"Create"** at the bottom

---

## 🎯 What This Does

### ✅ Benefits:

1. **No Direct Pushes to Main** - All changes must go through PR
2. **CI Must Pass** - Can't merge if ESLint or Prettier fails
3. **Code Review** - Optional but recommended
4. **Quality Assurance** - Ensures all code meets standards

### ⚠️ Important Notes:

- You can still create PRs and push to feature branches freely
- Only `main` branch is protected
- As repository owner, you can bypass rules (but don't!)
- Status checks will show as ❌ if not run yet - that's normal

---

## 🧪 Test Your Protection

### Test 1: Try Direct Push to Main (Should Fail)

```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin main
```

**Expected:** ❌ GitHub rejects the push

### Test 2: Use PR Workflow (Should Work)

```bash
git checkout -b feature/test
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin feature/test
# Create PR on GitHub
# Wait for checks to pass
# Merge button will be enabled
```

**Expected:** ✅ Merge allowed after checks pass

---

## 📊 Status Check Requirements

After setup, PRs will show:

- ⏳ **ESLint** - Running...
- ⏳ **Prettier** - Running...
- ⏳ **Quality Gate** - Waiting...

Must all show ✅ before merge button activates.

---

## 🔧 Troubleshooting

### Problem: Status checks not appearing

**Solution:** Push a commit to trigger workflows first

### Problem: Can't find status checks to select

**Solution:**

1. Create a PR first to trigger workflows
2. Come back to branch protection settings
3. Refresh and search again

### Problem: Accidentally pushed to main

**Solution:**

1. Branch protection not enabled yet - set it up now
2. Or: You're the owner and bypassed - don't do this!

---

## ✅ Verification Checklist

After setup, verify:

- [ ] "Settings → Branches" shows protection rule for `main`
- [ ] Rule shows "3 status checks required"
- [ ] Direct push to main is blocked
- [ ] PR shows required checks before merge
- [ ] Merge button disabled until checks pass

---

**Setup complete!** Your `main` branch is now protected. 🛡️
