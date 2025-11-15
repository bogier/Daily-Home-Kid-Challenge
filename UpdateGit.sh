#!/bin/ksh
#clear
#set -x # a enlever pour debug puis remettre le #
#exec 1>/dev/null
exec 2>/dev/null  # a mettre pour debug, puis enlever le #
#exec 3>/dev/null

cd "/c/Users/bogier/OneDrive/Bureau/Jeux HTML/Daily Home Kid Challenge"
cd VersionBleue
git remote -v
git fetch origin
git checkout main
cp -R ../DevEnCours/* ./

git status
git add .
git status
git commit -m "Ajout de ma derniere modification"
git push origin main

echo 'Modifications deployées'
exit 0
