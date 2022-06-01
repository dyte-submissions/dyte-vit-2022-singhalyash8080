#! /usr/bin/env node

const { program } = require('commander')
const Fs = require('fs');
const CsvReadableStream = require('csv-reader');

const compareVersions = require('compare-versions');

const execSync = require('child_process').execSync;

const fs = require("fs");

const readJson = require('read-package-json')


program
    .option('-u, --update_package <value...>', 'Updates the package version in the file')
    .option('-i, --check_version <value...>', 'Checks the package version in the file')
    .action(async(options) => {

        // if version specified of the package is not satisfied then creating a pull request to update the package version
        if (options.update_package) {


            const fileName = options.update_package[0]

            let inputStream = Fs.createReadStream('../csv_files/' + fileName, 'utf8');

            const structDatas = []

            inputStream
                .pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
                .on('data', (row) => {

                    const projectName = row[0]
                    const repoLink = row[1]

                    if (repoLink == 'repo') {
                        return;
                    }

                    const repoName = repoLink.slice(19).split('/')[1]

                    if (!fs.existsSync('./' + repoName)) {

                        execSync('git clone ' + repoLink, { encoding: 'utf-8' });

                    }

                    // const orgName = repoLink.slice(19).split('/')[0]

                    const packageToBeChecked = options.update_package[1].split('@')[0]
                    const packageVersionGiven = options.update_package[1].split('@')[1]

                    readJson(`./${repoName}/package.json`, console.error, false, function(er, data) {
                        if (er) {
                            console.error("There was an error reading the file", er)
                            return
                        }

                        // console.error('the package data is', data.dependencies)

                        const packageVersionInRepo = data.dependencies[packageToBeChecked].slice(1)

                        // console.log(packageVersionInRepo)

                        if (compareVersions(packageVersionInRepo, packageVersionGiven) == -1) {

                            data.dependencies[packageToBeChecked] = '^' + packageVersionGiven

                            execSync(`rm ${repoName}/package.json`, { encoding: 'utf-8' });

                            fs.writeFileSync(`./${repoName}/package.json`, JSON.stringify(data));

                            // push changes to a new branch
                            execSync(`cd ${repoName} && git checkout -b "updated_packages" && git add . && git commit -m "update package version" && git push origin updated_packages`, { encoding: 'utf-8' });

                            // create a pull request
                            execSync(`cd ${repoName} && git checkout master && git pull origin master && git merge updated_packages && git push origin master`, { encoding: 'utf-8' });

                            structDatas.push({
                                name: projectName,
                                repo: repoLink,
                                package: packageToBeChecked,
                                version: packageVersionInRepo,
                                satisfied: false,
                                update_pr: repoName + '/pull/' + execSync(`cd ${repoName} && git pull origin master && git log -1 --pretty=%B`, { encoding: 'utf-8' }).split(' ')[0]
                            })
                        } else {

                            structDatas.push({
                                name: projectName,
                                repo: repoLink,
                                package: packageToBeChecked,
                                version: packageVersionInRepo,
                                satisfied: true
                            })
                        }

                        // console.log(structDatas)
                    });

                })
                .on('end', () => {
                    console.log(structDatas)
                });

        } else {

            // checking if the version specified of the package is satisfied
            const fileName = options.check_version[0]

            let inputStream = Fs.createReadStream('../csv_files/' + fileName, 'utf8');

            const structDatas = []

            inputStream
                .pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
                .on('data', (row) => {

                    const projectName = row[0]
                    const repoLink = row[1]

                    if (repoLink == 'repo') {
                        return;
                    }

                    const repoName = repoLink.slice(19).split('/')[1]

                    if (!fs.existsSync('./' + repoName)) {

                        execSync('git clone ' + repoLink, { encoding: 'utf-8' });

                    }

                    // const orgName = repoLink.slice(19).split('/')[0]

                    const packageToBeChecked = options.check_version[1].split('@')[0]
                    const packageVersionGiven = options.check_version[1].split('@')[1]

                    readJson(`./${repoName}/package.json`, console.error, false, function(er, data) {
                        if (er) {
                            console.error("There was an error reading the file")
                            return
                        }

                        // console.error('the package data is', data.dependencies)

                        const packageVersionInRepo = data.dependencies[packageToBeChecked].slice(1)

                        if (compareVersions(packageVersionInRepo, packageVersionGiven) == -1) {

                            structDatas.push({
                                name: projectName,
                                repo: repoLink,
                                package: packageToBeChecked,
                                version: packageVersionInRepo,
                                satisfied: false
                            })
                        } else {

                            structDatas.push({
                                name: projectName,
                                repo: repoLink,
                                package: packageToBeChecked,
                                version: packageVersionInRepo,
                                satisfied: true
                            })
                        }

                        console.log(structDatas)
                    });

                })
                .on('end', () => {
                    console.log(structDatas)
                });

        }

    })

program.parse()