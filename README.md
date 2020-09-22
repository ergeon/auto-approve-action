# Auto-approve action

Automatically approve pull requests if it satisfies any of the conditions:
- If pull request was created by specific user
- If pull request contains specific file changes

Auto approve configures with json file.
```
{
  "allowed-authors": [
    "Abildin"               // Allowed github account
  ],
  "allowed-files": [
    [
      "requirements.txt"    // Changed only requirements.txt
    ],
    [
      "package.json",       // Changed package.json and yarn.lock
      "yarn.lock"
    ]
  ]
}
```

### Github workflow example:
```
name: Auto-approve pull request

on: pull_request

jobs:
  auto-approve:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2(
    - uses: Abildin/auto-approve-action@v1.0.0
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
        config: '.github/configs/auto-approve.json'
```
