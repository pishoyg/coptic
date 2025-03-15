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
	if [ -z "$${DRIVE_DIR}" ]; then
		echo -e "$${YELLOW}DRIVE_DIR$${RED} is not set.$${RESET}"
	fi

########## INSTALL ##########
install: FORCE
	./install.sh

update: FORCE
	./install.sh --update

# Clean up all untracked files and directories, recursing into subdirectories
# (-d), and also removing ignored files (-x).
# NOTE: Any igonred files that should be retained need to be excluded. See
# `.gitignore` for all ignored files.
.PHONY: clean
clean: FORCE
	git clean -x -d --force \
		--exclude ".myenv" \
		--exclude "google_cloud_keyfile.json" \

########## CONTENT GENERATION, TESTS, and FORMATTING ##########
.PHONY: all
all: generate_1 add generate_2 test report

# generate_1 rules are prerequisites for generate_2 rules.
.PHONY: generate_1
generate_1: bible copticsite crum crum_appendices crum_img kellia dawoud dawoud_img

.PHONY: generate_2
generate_2: flashcards kindle

# We have to duplicate the add / test rule, otherwise Make would
# deduplicate a rule that is mentioned twice as a prerequisite of some rule,
# therefore executing it only once!
.PHONY: test
add test: FORCE
	until git add --all && pre-commit run; do : ; done

########## STATS ##########
report: FORCE
	./stats.sh
stats: FORCE
	./stats.sh --commit
stats_format: FORCE
	python -c $$'import utils\n\
	utils.to_tsv(utils.read_tsv("data/stats.tsv"), "data/stats.tsv")'
plot: FORCE
	./stats.py

########## SERVER ##########
# In order for the site to render correctly, you need to start a local server
# and view it from there.
server: FORCE
	PORT="8000"; \
	echo -e "$${BLUE}Serving at $${GREEN}http://localhost:$${PORT}/$${BLUE}.$${RESET}"; \
	python -m http.server "$${PORT}" --bind "127.0.0.1" --directory "$${SITE_DIR}"

########## GIT STATUS ##########
# These rules are helpful if you want to run a pipeline and have it show the
# diff automatically once it's done. You can also invoke `yo` to have it notify
# you.
status: FORCE
	git status --short

diff: FORCE
	git diff --cached --word-diff

yo: FORCE
	say yo

########## BIBLE ##########
_bible_js: FORCE
	npx tsc -p "bible/stshenouda.org/tsconfig.json"
_bible: FORCE
	./bible/stshenouda.org/main.py
.PHONY: bible
bible: _bible_js _bible

epub_publish: REQUIRE_DRIVE_DIR FORCE
	cp \
	"docs/bible/epub/1/bohairic_english.epub" \
	"$${DRIVE_DIR}/bohairic_english - e-reader.epub"

	cp \
	"docs/bible/epub/2/bohairic_english.epub" \
	"$${DRIVE_DIR}/bohairic_english - desktop.epub"

########## COPTICSITE ##########
copticsite: FORCE
	./dictionary/copticsite.com/main.py

########## CRUM ##########
crum: FORCE
	./dictionary/marcion.sourceforge.net/main.py

crum_appendices: FORCE
	curl -L "https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?gid=1409267664&single=true&output=tsv" \
		> "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
	curl -L "https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?gid=1491216210&single=true&output=tsv" \
		> "dictionary/marcion.sourceforge.net/data/input/derivation_appendices.tsv"

crum_img: FORCE
	./dictionary/marcion.sourceforge.net/img_helper.py --batch

_crum_img_plot: FORCE
	./dictionary/marcion.sourceforge.net/img_helper.py --plot | less -R

# TODO: (#258) This rule is broken. You used to mark camera images by a source
# that doesn't start with 'http'. But you have been moving towards populating
# a link pointing to the GPS location where they were taken.
_camera_images: FORCE
	grep \
		--invert \
		-E "^http.*$$" \
		-R "dictionary/marcion.sourceforge.net/data/img-sources" \
		| grep -oE "[^/]+$$" \
		| sed 's/\.txt:/ /' \
		| awk '{ printf "\033[32m%-15s\t\033[31m%-15s\033[0;39m\n", $$1, $$2 }'

	grep \
		--invert \
		-E "^http.*$$" \
		-R "dictionary/marcion.sourceforge.net/data/img-sources" \
		--files-with-matches \
		| sed 's/img-sources/img/' \
		| sed "s/\.txt$$/\.*/" \
		| while read -r GLOB; do ls $${GLOB} | xargs open; done

########## KELLIA ##########
kellia: FORCE
	./dictionary/kellia.uni-goettingen.de/main.py

_kellia_analysis: FORCE
	./dictionary/kellia.uni-goettingen.de/analysis.py

_kellia_analysis_clean: dictionary/kellia.uni-goettingen.de/data/output/analysis.json
	# Reset the KELLIA analysis JSON. Seemingly, it gets rewritten in a
	# nondeterministic manner by the pipeline, introducing noisy changes in the
	# repo, so we reset it to remove the noise.
	# TODO: Make the pipeline deterministic, and remove this rule.
	git restore "dictionary/kellia.uni-goettingen.de/data/output/analysis.json"

########## DAWOUD ##########
dawoud: FORCE
	npx tsc -p "dictionary/copticocc.org/tsconfig.json"

dawoud_img:
	./dictionary/copticocc.org/crop.sh

########## LEXICON ##########
_flashcards_js: FORCE
	npx tsc -p "flashcards/tsconfig.json"
_web_js: FORCE
	npx tsc -p "web/tsconfig.json"
_flashcards:
	./flashcards/main.py \
		--html \
		--anki \
		--xooxle
_bashandy:
	./flashcards/bashandy.sh
.PHONY: flashcards
flashcards: _flashcards_js _web_js _flashcards _bashandy

anki_publish: REQUIRE_DRIVE_DIR FORCE
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
	"dictionary/marcion.sourceforge.net/data/output/mobi/dialect-B/dialect-B.opf"

mobi_publish: REQUIRE_DRIVE_DIR FORCE
	cp \
	"dictionary/marcion.sourceforge.net/data/output/mobi/dialect-B/dialect-B.mobi" \
	"$${DRIVE_DIR}"
else
kindle: FORCE
	echo -e "$${YELLOW}Work in progress!$${RESET}"
mobi_publish: FORCE
	echo -e "$${YELLOW}Work in progress!$${RESET}"
endif
