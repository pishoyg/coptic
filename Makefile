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

upgrade: FORCE
	# Upgrade dependencies.
	./install.sh --upgrade

# NOTE: Any igonred files that should be retained need to be excluded. See
# `.gitignore` for all ignored files.
.PHONY: clean
clean: FORCE
	# Clean up all untracked files and directories.
	git clean -x -d --force \
		--exclude ".envrc" \
		--exclude "google_cloud_keyfile.json" \

########## CONTENT GENERATION, TESTS and FORMATTING ##########
.PHONY: all
all: crum kellia andreas anki kindle bible transpile test

.PHONY: test
test: FORCE
	# Run pre-commit hooks repeatedly, staging changes, until they pass once.
	until git add --all && pre-commit run; do : ; done

########## STATS ##########
stats: FORCE
	# Collect statistics, saving them to the stats file, and committing changes.
	./stats.py --commit --print

########## SERVER ##########
server: FORCE
	# Start a server for the local copy of the website.
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
	# NOTE: This target should stay in sync with the TypeScript compiler. See
	# `tsconfig.json`.
	# TODO: (#0) Upgrade the target whenever it has aged enough.
	npx esbuild \
		$$(find docs -name "*.ts" -not -name "*.test.ts" -not -name "*.d.ts") \
		--target=ES2025 \
		--outdir=docs \
		--minify \
		--sourcemap

javascript:
	# Create a JavaScript transpilation commit.
	@if git status --porcelain | grep -Ev '\.js(\.map)?$$' | grep -q .; then \
		echo -e "$${RED}Dirty worktree contains non-JavaScript files.$${RESET}"; \
		echo -e "$${YELLOW}$$(git status --porcelain | grep -v '\.js$$')$${RESET}"; \
		exit 1; \
	fi

	# Transpile the TypeScript.
	$(MAKE) transpile

	# Run Playwright tests.
	# They should run as a pre-commit hook. However, right now, pre-commit ignores
	# all JavaScript files, so we add this invocation here.
	npx playwright test
	git add --all
	git commit --no-verify --message '[TypeScript] `make javascript`'

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

########## CRUM ##########
crum: FORCE
	# Generate the Crum lexicon artefacts.
	./dictionary/marcion_sourceforge_net/main.py
	./dictionary/marcion_sourceforge_net/pisaxo.ts

########## CRUM WIKI ENRICHMENT ##########
# Materialize the enrichment that `docs/crum/wiki.ts` performs in the browser.
#
# NOTE: This is deliberately not part of `crum`, even though it is derived from
# the HTML that `crum` writes and does go stale when the Wiki data changes. It
# takes minutes, and it depends on the transpiled JavaScript besides, which
# `crum` has no business rebuilding. Run it yourself after either changes.
#
# NOTE: It reads the *transpiled* JavaScript under `docs/`, exactly as
# `pisaxo.ts` does. After editing the enrichment TypeScript, run `make
# transpile` (or `make javascript`) first, or the dump will faithfully describe
# the previous version of the engine.
#
# NOTE: The HTML should be formatted prior to running the `wiki` recipe. In
# particular, unformatted HTML changes the output due to #784.
wiki: FORCE
	# Generate the Crum Wiki enrichment dump.
	./dictionary/marcion_sourceforge_net/wiki.ts

# TODO: (#421) Delete this rule. We will no longer retain the original images,
# and this won't be even possible.
crum_img: FORCE
	# Reprocess Crum's images.
	./dictionary/marcion_sourceforge_net/img_helper.py --batch

crum_sentinels: FORCE
	# Download a new version of Crum's sentinels sheet.
	# NOTE: Coptic sentinels are generated by the pipeline. This only downloads
	# the sentinels of the indexes.
	PUB="https://docs.google.com/spreadsheets/d/e/2PACX-1vS0Btx-Vz3n5J_sn0dOueWpN_lk64AdV7RrKDp_VNqVfCHajdHoQs67Xeld94jwyRVkqaRxlaRFNH5F/pub?output=tsv"; \
	DIR="docs/crum/crum"; \
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
kellia: FORCE
	# Generate the KELLIA lexicon artefacts.
	./dictionary/kellia_uni_goettingen_de/main.py

kellia_analysis: FORCE
	# Generate an analysis of the structure of the TLA (KELLIA) dataset.
	./dictionary/kellia_uni_goettingen_de/analysis.py

########## DAWOUD ##########
dawoud_sentinels: FORCE
	# Download a new version of Dawoud's sentinels sheet.
	PUB="https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-qCcmKVqniHVF6vtmzRoedIqgH96sDWMetp4HMSApUKNCZSqUDi3FnU_tW87yWBH2HPMbjJei9KIL/pub?output=tsv"; \
	DIR="docs/dawoud"; \
	curl -L "$${PUB}&gid=0" > "$${DIR}/coptic.tsv"; \
	curl -L "$${PUB}&gid=2057030060" > "$${DIR}/greek.tsv"; \
	curl -L "$${PUB}&gid=1482232549" > "$${DIR}/arabic.tsv";

########## Andreas ##########
andreas: FORCE
	# Generate the Andreas lexicon artefacts.
	./dictionary/stmacariusmonastery_org/main.py
	# Write the output, without the KEY lines, to a separate JSON (currently
	# unused). This gives us an index to `diff` without the noise created by `KEY`
	# shifts. In the original JSON, whenever an entry is created or deleted, all
	# KEY values shift by 1, creating a huge `diff` that is inconvenient to deal
	# with.
	# TODO: (#591) Delete this file once you're more confident about your
	# algorithm, or once key shifts are guaranteed not to happen.
	cat "docs/crum/andreas.json" | grep -v 'KEY' > "dictionary/stmacariusmonastery_org/data/output/andreas.json"

########## FLASHCARDS ##########
anki: FORCE
	# Generate the Anki package.
	./flashcards/main.py

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

########## SITEMAP ##########
sitemap: FORCE
	./sitemap.py
