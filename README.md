AutoGO
=======

AutoGO is a script for running [Genshin Optimizer](https://frzyc.github.io/genshin-optimizer/#/) with a database of GOOD profiles against certain character templates using TC-mode.


## Setup
Install dependencies using `npm i`. Put your GOOD files into the `good` folder, set which templates to run in `settings.json`. See [Creating templates](#creating-templates) on how to create your own templates. Finally run AutoGO using `npm run start`. 

## File structure

- `./good/`: Folder containing GOOD files to check against. Filename is assumed to be some kind of user identification (for logging) and reducing redundant calculations. Recommended to have user + some kind of versioning / date.
- `./templates/`: Folder containing available templates. Can be generated using `src/createTemplate`. Needs to be listed in `settings.json` to be checked against.
- `./output/`: Folder containing output for each template.
- `settings.json`: Config file for script, contains a list of templates to run as wel as a setting to enable/disable the testing of all users or only ones missing in output.


## Creating templates

Templates can easily be created using the `createTemplate` script.  

First prepare the calculation you want to do in your own GO profile. Make sure to have something that outputs into `Theorycrafting` mode. If only one number is needed, it is recommended to use `Healing Bonus` or `XXX DMG Bonus` to compare against as these only have a couple possibilities. To reduce computation time on heavy calculations (like HT CA for all artifacts), you might want to consider filtering to something like (HP/EM)/(Pyro)/(CRIT Rate/DMG); this might not be needed if already filtering for a specific artifact set. 

Afterwards, export your GO database by going to `Settings` and under `Database Download` click on `Copy to Clipboard`. (You can also export to file and use that, but clipboard might be easier).  

To create a template from your GOOD dump, run `node src/createTemplate.js [char, optional only if 1 char in DB] <templateName> [optionally, file if not from clipboard]`. `char` needs to be the character name used in GO (see URL when editing character build; for example `HuTao` and `KaedeharaKazuha`). `templateName` will be used in the filename of the template file and output file (do not include `.json` in your name).

If the template needs to filter out all artifact sets except a certain one, use `artSetExclusionOverrides`. If provided, AutoGO will automatically fill in the other artifact sets with exclusions.

Finally, put the path to your template file in `settings.json` and run AutoGO using `npm run start` to calculate the values for all GOOD dumps in your `good` folder.


