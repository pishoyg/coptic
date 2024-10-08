SHELL := /bin/bash

# NOTE:
# - For those rules that use helpers, shell commands should be preceded by `.
#   ./.helpers` in order to make sure the helpers are sourced before execution.
#   This is done in order to allow rules to execute normally even if the user
#   forgot to source their `.env` (or `.helpers`). Notice that it doesn't
#   suffice to source the helpers once, they need to be sourced before every
#   line, because Make executes each line in a separate shell, and each shell
#   must have its own sourcing.
# - For those rules that require environment variables (other than the
#   helpers), they depend on the REQUIRE_ENV rule, which asks the users to
#   source their `.env` file (if it's not sourced already). We can't take the
#   liberty to source it on their behalf (as we do with the helpers), because
#   (1) we don't know which file we should be sourcing (it could be `.env` or
#   `.env_INFO`), and (2) they need to know what they are doing, and the
#   implications of running rules with certain variables, so we can't take this
#   decision on their behalf.
# See also `.env_INFO`.

# NOTE: We maintain a hierarchical structure for our rules. Level-2 rules are
# only allowed to use level-1 rules, and level-3 rules are only allowed to use
# level-2 rules.

# LEVEL 3 RULES ###############################################################

.PHONY: all
all: generate_1 add generate_2 index generate_3 test publish report

# LEVEL 2 RULES ###############################################################

# generate_1 rules are prerequisites for generate_2 rules.
.PHONY: generate_1
generate_1: bible copticsite crum crum_appendices crum_img kellia transpile

.PHONY: generate_2
generate_2: flashcards kindle

.PHONY: generate_3
generate_3: xooxle

# NOTE: We have to duplicate the add / index / test rule, otherwise Make would
# deduplicate a rule that is mentioned twice as a prerequisite of some rule,
# therefore executing it only once!
# We call the identical triplets `add`, `index`, and `test` instead of
# `add_1`, `add_2`, and `add_3`, because (1) Makefile normally has a `test`
# rule, and (2) they are easier to type, and we need to type them often.
# We prefer the name `add` or `index` since it's indicative of the fact that
# this rules adds all local changes from the worktree to the index. We also
# prefer uniformity. But in this case, we prioritize convenience!
.PHONY: add
add: _add_1

.PHONY: index
index: _add_2

.PHONY: test
test: _add_3

.PHONY: publish
publish: anki_publish epub_publish mobi_publish site_publish

.PHONY: report
report: stats_report

# The following rules are more or less only relevant for testing / development,
# rather content (re)generation.

.PHONY: install
install: pip_install python_install precommit_install bin_install npm_install

.PHONY: flashcards_crum_all_dialects
flashcards_crum_all_dialects: _flashcards_crum_all_dialects

.PHONY: flashcards_copticsite
flashcards_copticsite: _flashcards_copticsite

.PHONY: flashcards_kellia
flashcards_kellia: _flashcards_kellia

.PHONY: kellia_analysis
kellia_analysis: _kellia_analysis

.PHONY: stats
stats: stats_commit

.PHONY: stats_format
stats_format: _stats_format

.PHONY: clean
clean: git_clean kellia_analysis_clean

.PHONY: status
status: git_status

.PHONY: diff
diff: git_diff

.PHONY: toil
toil: crum_img_helper

.PHONY: update
update: precommit_update pip_update

.PHONY: camera
camera: camera_images

.PHONY: crum_img_plot
crum_img_plot: _crum_img_plot

.PHONY: yo
yo: say_yo

.PHONY: server
server: _server

# LEVEL 1 RULES ###############################################################

xooxle: FORCE
	python site/main.py

transpile: FORCE
	npx tsc -p "flashcards/constants/a_coptic_dictionary/tsconfig.json"
	npx tsc -p "site/tsconfig.json"

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py

epub_publish: REQUIRE_ENV FORCE
	cp \
	"bible/stshenouda.org/data/output/epub/1/bohairic_english.epub" \
	"$${DRIVE_DIR}/bohairic_english - e-reader.epub"

	cp \
	"bible/stshenouda.org/data/output/epub/2/bohairic_english.epub" \
	"$${DRIVE_DIR}/bohairic_english - desktop.epub"

# COPTICSITE_COM RULES
copticsite: FORCE
	python dictionary/copticsite.com/main.py

# CRUM RULES
crum: $(shell find dictionary/marcion.sourceforge.net/ -type f)
	python dictionary/marcion.sourceforge.net/main.py

crum_appendices: FORCE
	curl -L "https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?gid=1409267664&single=true&output=tsv" \
		> "dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv"
	curl -L "https://docs.google.com/spreadsheets/d/e/2PACX-1vTItxV4E4plQrzjWLSea85ZFQWcQ4ba-p2BBIDG9h5yI0i9URn9GD9zZhxEj8kVI7jhCoPWPEapd9D7/pub?gid=1491216210&single=true&output=tsv" \
		> "dictionary/marcion.sourceforge.net/data/input/derivation_appendices.tsv"

crum_img: $(shell find dictionary/marcion.sourceforge.net/data/ -type f)
	python dictionary/marcion.sourceforge.net/img_helper.py --batch

_crum_img_plot: FORCE
	python dictionary/marcion.sourceforge.net/img_helper.py --plot | less -R

crum_img_helper: REQUIRE_ENV FORCE
	# TODO: (#5) Remove the filters. Do all the words.
	python dictionary/marcion.sourceforge.net/img_helper.py \
		--skip_existing=true \
		--exclude "dialect-B:" \
		--start="$${START_KEY}" \
		--end="$${END_KEY}"

# KELLIA RULES
kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

_kellia_analysis: FORCE
	python dictionary/kellia.uni-goettingen.de/analysis.py

kellia_analysis_clean: dictionary/kellia.uni-goettingen.de/data/output/analysis.json
	git restore "dictionary/kellia.uni-goettingen.de/data/output/analysis.json"

# FLASHCARD RULES
flashcards: FORCE
	python flashcards/main.py

anki_publish: REQUIRE_ENV $(shell find flashcards/data/output/anki/ -type f)
	cp \
		flashcards/data/output/anki/coptic.apkg \
		"$${DRIVE_DIR}"

_flashcards_crum_all_dialects: FORCE
	python flashcards/main.py \
		--decks "A Coptic Dictionary::All Dialects" \
		--output_dir "/tmp/" \
		--anki "/tmp/crum_all_dialects.apkg" \
		--web_mask "true"

_flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--output_dir "/tmp/" \
		--anki "/tmp/anki/copticsite.apkg" \
		--web_mask "true"

_flashcards_kellia: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" "KELLIA::Egyptian" "KELLIA::Greek"\
		--output_dir "/tmp/" \
		--anki "/tmp/anki/kellia.apkg" \
		--web_mask "true" "true" "true"

# KINDLE RULES
# TODO: (#44) Restore the rules (with appropriate paths) once the pipeline is
# designed.
ifeq ("true", "false")
kindle: FORCE
	./archive/kindlegen/kindlegen \
	-gen_ff_mobi7 \
	-dont_append_source \
	-c0 \
	"dictionary/marcion.sourceforge.net/data/output/mobi/dialect-B/dialect-B.opf"

mobi_publish: REQUIRE_ENV FORCE
	cp \
	"dictionary/marcion.sourceforge.net/data/output/mobi/dialect-B/dialect-B.mobi" \
	"$${DRIVE_DIR}"
else
kindle: FORCE
	. ./.helpers && echo -e "$${YELLOW}Work in prgress!$${RESET}"
mobi_publish: REQUIRE_ENV FORCE
	. ./.helpers && echo -e "$${YELLOW}Work in prgress!$${RESET}"
endif

# SITE RULES

site_publish: REQUIRE_ENV FORCE
	bash site/publish.sh \
		--clean \
		--build \
		--commit \
		--push

_server: REQUIRE_ENV FORCE
	. ./.helpers && echo -e "$${BLUE}Serving at $${GREEN}http://localhost:8000/$${BLUE}.$${RESET}"; \
	python -m http.server 8000 --bind 127.0.0.1 --directory "$${SITE_DIR}"; \

# INFRASTRUCTURE RULES
bin_install: FORCE
	. ./.helpers && if ! command -v npm &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}npm$${RED}. See $${YELLOW}https://docs.npmjs.com/downloading-and-installing-node-js-and-npm${RED}.$${RESET}" && exit 1; fi
	. ./.helpers && if ! command -v tidy &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}tidy$${RED} from $${YELLOW}https://www.html-tidy.org/${RED}.$${RESET}" && exit 1; fi
	. ./.helpers && if ! command -v magick &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}magick$${RED} from $${YELLOW}https://imagemagick.org/${RED}.$${RESET}" && exit 1; fi
	. ./.helpers && if ! command -v gh &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}gh$${RED} from $${YELLOW}https://cli.github.com/${RED}.$${RESET}" && exit 1; fi
	. ./.helpers && if ! command -v say &> /dev/null; then echo -e "$${YELLOW}Consider installing $${CYAN}say$${YELLOW}. This should be possible with $${CYAN}sudo apt-get install gnustep-gui-runtime$${YELLOW} on Ubuntu.$${RESET}"; fi


npm_install: FORCE
	npm install \
		--save-dev \
		"typescript" \
		"stylelint"

pip_install: requirements.txt
	python -m pip install --upgrade pip $${PIP_FLAGS}
	python -m pip install -r requirements.txt $${PIP_FLAGS}

pip_update: FORCE
	pip-review --local --auto

python_install: FORCE
	python -m pip install -e . $${PIP_FLAGS}

precommit_install: FORCE
	pre-commit install

_add_1 _add_2 _add_3: FORCE
	until git add --all && pre-commit run; do : ; done

precommit_update: FORCE
	pre-commit autoupdate

git_clean: FORCE
	git clean \
		-x \
		-d \
		--exclude ".env" \
		--force

git_status: FORCE
	git status --short

git_diff: FORCE
	git diff --cached --word-diff

stats_report: FORCE
	bash stats.sh

stats_commit: FORCE
	bash stats.sh --commit

_stats_format: FORCE
	python -c $$'import utils\n\
	utils.to_tsv(utils.read_tsv("data/stats.tsv"), "data/stats.tsv")'

camera_images: FORCE
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

say_yo: FORCE
	say yo

# LEVEL-0 rules ###############################################################

# FORCE
.PHONY: FORCE
FORCE:

.PHONY: REQUIRE_ENV
REQUIRE_ENV: FORCE
	. ./.helpers && if [ -z "$${ENV_HAS_BEEN_SOURCED}" ]; then \
		echo -e "$${RED}Environment variables are required by this recipe.$${RESET}"; \
		echo -e "$${RED}They seem not to have been exported.$${RESET}"; \
		echo -e "$${RED}Did you forget to source $${YELLOW}.env$${RED}?$${RESET}"; \
		echo -e "$${RED}See $${YELLOW}.env_INFO$${RED} for more information.$${RESET}"; \
		exit 1; \
	fi
