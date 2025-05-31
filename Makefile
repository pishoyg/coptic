SHELL := /bin/bash

# NOTE: Many recipes assume that the environment has been set up:
# ```
# source ./.env
# ```

########## HELPERS ##########
.PHONY: FORCE
FORCE:

# Rules that require the `DRIVE_DIR` environment variable won't work even
# if `.env` is sourced, because this variable is not defined in `.env`. This is
# because requires additional setup that can not be contained within this repo.
REQUIRE_DRIVE_DIR: FORCE
	# Force DRIVE_DIR environment variable to be defined.
	if [ -z "$${DRIVE_DIR}" ]; then \
		echo -e "$${YELLOW}DRIVE_DIR$${RED} is not set.$${RESET}"; \
	fi

########## INSTALL ##########
install: FORCE
	# Install dependencies.
	./install.sh

# TODO: (#0) Rename to `upgrade`.
update: FORCE
	# Upgrade dependencies.
	./install.sh --update

# NOTE: Any igonred files that should be retained need to be excluded. See
# `.gitignore` for all ignored files.
.PHONY: clean
clean: FORCE
	# Clean up all untracked files and directories.
	git clean -x -d --force \
		--exclude ".myenv" \
		--exclude "google_cloud_keyfile.json" \

########## CONTENT GENERATION, TESTS and FORMATTING ##########
.PHONY: all
all: crum flashcards kindle bible transpile test report

.PHONY: test
test: FORCE
	# Run pre-commit hooks repeatedly, staging changes, until they pass once.
	until git add --all && pre-commit run; do : ; done

########## STATS ##########
report: FORCE
	# Print statistics.
	./stats.sh
stats: FORCE
	# Print statistics, saving them to the stats, and committing changes.
	./stats.sh --commit
stats_format: FORCE
	# Reformat the stats file (useful if you recently added a column).
	python -c $$'import utils\n\
	utils.to_tsv(utils.read_tsv("data/stats.tsv"), "data/stats.tsv")'
plot: FORCE
	# Plot stats.
	./stats.py

########## SERVER ##########
server: FORCE
	# Start a server for the local copy of the website.
	PORT="8000"; \
	echo -e "$${BLUE}Serving at $${GREEN}http://localhost:$${PORT}/$${BLUE}.$${RESET}"; \
	python -m http.server "$${PORT}" --bind "127.0.0.1" --directory "$${SITE_DIR}"

########## GIT STATUS ##########
# These rules are helpful if you want to run a pipeline and have it show the
# diff automatically once it's done. You can also invoke `yo` to have it notify
# you.
#
# A common combination of recipes is:
#   ```
#   make ${RECIPE} test yo diff
#   ```
# This runs ${RECIPE}, then appeases pre-commit hooks, notifies the user that
# the pipeline is ready, and then showing the diff.
status: FORCE
	# Show Git status.
	git status --short

diff: FORCE
	# Show Git diff.
	git diff --cached --word-diff

yo: FORCE
	# Say yo.
	say yo

########## TypeScript ##########
transpile: FORCE
	# Transpile TypeScript to JavaScript.
	npx tsc -p "tsconfig.json"

########## BIBLE ##########
bible: FORCE
	# Run the Bible pipeline.
	./bible/stshenouda_org/main.py

epub_publish: REQUIRE_DRIVE_DIR FORCE
	# Publish the Bible EPUBs to Drive.
	cp \
	"docs/bible/epub/1/bohairic english.epub" \
	"$${DRIVE_DIR}/bohairic_english - e-reader.epub"

	cp \
	"docs/bible/epub/2/bohairic english.epub" \
	"$${DRIVE_DIR}/bohairic_english - desktop.epub"

########## COPTICSITE ##########

########## CRUM ##########
crum: FORCE
	# Download a new version of Crum's data, and trigger the parser to validate it.
	PUB="https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?output=tsv"; \
	DIR="dictionary/marcion_sourceforge_net/data/input"; \
	curl -L "$${PUB}&gid=1575616379" > "$${DIR}/coptwrd.tsv"; \
	curl -L "$${PUB}&gid=698638592" > "$${DIR}/coptdrv.tsv"; \
	./dictionary/marcion_sourceforge_net/main.py

# TODO: (#421) Delete this rule. We will no longer retain the original images,
# and this won't be even possible.
crum_img: FORCE
	# Reprocess Crum's images.
	./dictionary/marcion_sourceforge_net/img_helper.py --batch

crum_img_plot: FORCE
	# Plot stats about image collection.
	./dictionary/marcion_sourceforge_net/img_helper.py --plot | less -R

crum_scan:
	# Download Crum's scan.
	./dictionary/marcion_sourceforge_net/download_scan.sh

crum_sentinels: FORCE
	# Download a new version of Crum's sentinels sheet.
	PUB="https://docs.google.com/spreadsheets/d/e/2PACX-1vS0Btx-Vz3n5J_sn0dOueWpN_lk64AdV7RrKDp_VNqVfCHajdHoQs67Xeld94jwyRVkqaRxlaRFNH5F/pub?output=tsv"; \
	DIR="docs/crum/crum"; \
	curl -L "$${PUB}&gid=0" > "$${DIR}/coptic.tsv"; \
	curl -L "$${PUB}&gid=2147273844" > "$${DIR}/english.tsv"; \
	curl -L "$${PUB}&gid=1229285156" > "$${DIR}/greek.tsv"; \
	curl -L "$${PUB}&gid=1297903664" > "$${DIR}/arabic.tsv";

# TODO: (#258) This rule is broken. You used to mark camera images by a source
# that doesn't start with 'http'. But you have been moving towards populating
# a link pointing to the GPS location where they were taken.
camera_images: FORCE
	grep \
		--invert \
		-E "^http.*$$" \
		-R "dictionary/marcion_sourceforge_net/data/img-sources" \
		| grep -oE "[^/]+$$" \
		| sed 's/\.txt:/ /' \
		| awk '{ printf "\033[32m%-15s\t\033[31m%-15s\033[0;39m\n", $$1, $$2 }'

	grep \
		--invert \
		-E "^http.*$$" \
		-R "dictionary/marcion_sourceforge_net/data/img-sources" \
		--files-with-matches \
		| sed 's/img-sources/img/' \
		| sed "s/\.txt$$/\.*/" \
		| while read -r GLOB; do ls $${GLOB} | xargs open; done

########## KELLIA ##########
kellia_analysis: FORCE
	# Generate an analysis of the structure of the TLA (KELLIA) dataset.
	./dictionary/kellia_uni_goettingen_de/analysis.py

# Seemingly, the KELLIA analysis JSON gets rewritten in a undeterministic
# manner by the pipeline, introducing noisy changes in the
# repo, so we reset it to remove the noise.
# TODO: (#0) Make the pipeline deterministic, and remove this rule.
kellia_analysis_clean: dictionary/kellia_uni_goettingen_de/data/output/analysis.json
	# Reset the KELLIA analysis JSON.
	git restore "dictionary/kellia_uni_goettingen_de/data/output/analysis.json"

########## DAWOUD ##########
dawoud_img: FORCE
	# Reprocess Dawoud's scan.s
	./dictionary/copticocc_org/crop.sh

dawoud_sentinels: FORCE
	# Download a new version of Dawoud's sentinels sheet.
	PUB="https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-qCcmKVqniHVF6vtmzRoedIqgH96sDWMetp4HMSApUKNCZSqUDi3FnU_tW87yWBH2HPMbjJei9KIL/pub?output=tsv"; \
	DIR="docs/dawoud"; \
	curl -L "$${PUB}&gid=0" > "$${DIR}/coptic.tsv"; \
	curl -L "$${PUB}&gid=2057030060" > "$${DIR}/greek.tsv"; \
	curl -L "$${PUB}&gid=1482232549" > "$${DIR}/arabic.tsv";

########## LEXICON ##########
flashcards_crum: FORCE
	# Generate the Crum lexicon artefacts.
	./flashcards/main.py --crum

flashcards_kellia: FORCE
	# Generate the KELLIA lexicon artefacts.
	./flashcards/main.py --kellia

flashcards_copticsite: FORCE
	# Generate the copticsite lexicon artefacts.
	./flashcards/main.py --copticsite

flashcards_anki: FORCE
	# Generate the Anki package.
	./flashcards/main.py --anki

flashcards: FORCE
	# Generate all Lexicon artefacts.
	./flashcards/main.py \
		--crum \
		--kellia \
		--copticsite \
		--anki

bashandy: FORCE
	# Generate the Bashandy version of the Lexicon page.
	./flashcards/bashandy.sh

anki_publish: REQUIRE_DRIVE_DIR FORCE
	# Publish the Anki package to Drive.
	cp \
		"docs/crum/anki/coptic.apkg" \
		"$${DRIVE_DIR}"

########## MORPHOLOGY ##########
# TODO: (#44) Restore the rules (with appropriate paths) once the pipeline is
# designed.
ifeq ("true", "false")
kindle: FORCE
	./archive/kindlegen/kindlegen \
	-gen_ff_mobi7 \
	-dont_append_source \
	-c0 \
	"dictionary/marcion_sourceforge_net/data/output/mobi/dialect-B/dialect-B.opf"

mobi_publish: REQUIRE_DRIVE_DIR FORCE
	# Publish the Mobi Kindle dictionary to Drive.
	cp \
	"dictionary/marcion_sourceforge_net/data/output/mobi/dialect-B/dialect-B.mobi" \
	"$${DRIVE_DIR}"
else
kindle: FORCE
	echo -e "$${YELLOW}Work in progress!$${RESET}"
mobi_publish: FORCE
	echo -e "$${YELLOW}Work in progress!$${RESET}"
endif
