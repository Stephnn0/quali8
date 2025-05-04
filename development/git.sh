git checkout main

git checkout -b release/app-release

git cherry-pick d454636c3c73bcc57d7193b9d42d477e468bd91b

git push origin release/app-release

-------------------------------------

git fetch --all

git checkout staging

git rebase origin/main

git push origin staging --force