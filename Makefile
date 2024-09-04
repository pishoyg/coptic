SHELL := /bin/bash

# NOTE: Some rules require the environment variables to be exported.
# See .env_INFO.

# NOTE: We maintain a hierarchical structure for our rules. Level-2 rules are
# only allowed to use level-1 rules, and level-3 rules are only allowed to use
# level-2 rules.

# LEVEL 3 RULES ###############################################################

.PHONY: all
all: install generate_1 add generate_2 test publish report

# LEVEL 2 RULES ###############################################################

.PHONY: install
install: pip_install python_install precommit_install bin_install npm_install

# generate_1 rules are prerequisites for generate_2 rules.
.PHONY: generate_1
generate_1: bible copticsite crum crum_appendices crum_img kellia ts_transpile xooxle

.PHONY: generate_2
generate_2: flashcards kindle

# NOTE: We have to duplicate the add / test rule, otherwise Make would
# deduplicate a rule that is mentioned twice as a prerequisite of some rule,
# therefore executing it only once!
# We call the identical twins `add` and `test` instead of `add_1` and `add_2`
# because Makefile normally requires a `test` rule. We prefer the name `add`
# since it's indicative of the fact that this rules adds all local changes from
# the worktree to the index.
.PHONY: add
add: _add

.PHONY: test
test: _test

.PHONY: publish
publish: anki_publish epub_publish mobi_publish site_publish

.PHONY: report
report: stats_report

# The following rules are more or less only relevant for testing / development,
# rather content (re)generation.

.PHONY: flashcards_crum_all_dialects
flashcards_crum_all_dialects: _flashcards_crum_all_dialects

.PHONY: flashcards_copticsite
flashcards_copticsite: _flashcards_copticsite

.PHONY: flashcards_kellia
flashcards_kellia: _flashcards_kellia

.PHONY: bible_no_epub
bible_no_epub: _bible_no_epub

.PHONY: kellia_analysis
kellia_analysis: _kellia_analysis

.PHONY: stats
stats: stats_save

.PHONY: stats_format
stats_format: _stats_format

.PHONY: clean
clean: git_clean bible_epub_clean kellia_analysis_clean

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

.PHONY: yo
yo: say_yo

# LEVEL 1 RULES ###############################################################

xooxle: FORCE
	python site/xooxle.py \
		--directory "flashcards/data/output/web/a_coptic_dictionary__all_dialects/" \
		--output "site/data/crum/index.json" \
		--exclude "header"

ts_transpile: FORCE
	npx tsc -p "flashcards/constants/a_coptic_dictionary/tsconfig.json"
	npx tsc -p "site/tsconfig.json"

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py

_bible_no_epub: FORCE
	python bible/stshenouda.org/main.py \
		--no_epub=true

epub_publish: FORCE
	cp \
	"bible/stshenouda.org/data/output/epub/1/bohairic_english.epub" \
	"$${BIBLE_DIR}/2. bohairic_english - single-column - Kindle.epub"

bible_epub_clean: $(shell ls bible/stshenouda.org/data/output/epub/*/*.epub)
	git restore "bible/stshenouda.org/data/output/epub/*/*.epub"

# COPTICSITE_COM RULES
copticsite: FORCE
	python dictionary/copticsite.com/main.py

# CRUM RULES
crum: $(shell find dictionary/marcion.sourceforge.net/ -type f)
	python dictionary/marcion.sourceforge.net/main.py



crum_appendices: FORCE

	python -c $$'import utils\n\
	utils.download_gsheet(\
	"https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg",\
	"dictionary/marcion.sourceforge.net/data/input/root_appendices.tsv",\
	0,\
	)'

	python -c $$'import utils\n\
	utils.download_gsheet(\
	"https://docs.google.com/spreadsheets/d/1OVbxt09aCxnbNAt4Kqx70ZmzHGzRO1ZVAa2uJT9duVg",\
	"dictionary/marcion.sourceforge.net/data/input/derivation_appendices.tsv",\
	1,\
	)'

	# Verify the senses have valid JSON, and numerical keys.
	for BASENAME in "root_appendices.tsv" "derivation_appendices.tsv"; do \
		KEYS=$$(cut \
			--fields 5 \
			"dictionary/marcion.sourceforge.net/data/input/$${BASENAME}" \
			| tail -n +2  \
			| grep --invert -E '^[[:space:]]*$$' \
			| sed 's/""/"/g' \
			| sed 's/"//' \
			| rev | sed 's/"//' | rev \
			| jq "keys" \
			| grep -o '".*"' \
			| grep '"[[:digit:]]+"' --extended-regexp --invert); \
		if [ -n "$${KEYS}" ]; then \
			echo -e "$${RED}$${KEYS}$${PURPLE} are invalid.$${RESET}"; \
			exit 1; \
		fi; \
	done

crum_img: $(shell find dictionary/marcion.sourceforge.net/data/ -type f)
	python dictionary/marcion.sourceforge.net/img_helper.py --batch

crum_img_helper: FORCE
	# TODO: (#5) Remove the filters. Do all the words.
	python dictionary/marcion.sourceforge.net/img_helper.py \
		--skip_existing=true \
		--exclude "type-parsed:verb" "dialect-B:" \
		--start_at_key="$${START_AT_KEY}" \
		--thenounproject_key="$${THENOUNPROJECT_KEY}" \
		--thenounproject_secret="$${THENOUNPROJECT_SECRET}"

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

anki_publish: $(shell find flashcards/data/output/anki/ -type f)
	cp \
		flashcards/data/output/anki/coptic.apkg \
		"$${FLASHCARD_DIR}"

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

mobi_publish:
	cp \
	"dictionary/marcion.sourceforge.net/data/output/mobi/dialect-B/dialect-B.mobi" \
	"$${KINDLE_DIR}"
else
kindle: FORCE
	echo -e "$${YELLOW}Work in prgress!$${RESET}"
mobi_publish:
	echo -e "$${YELLOW}Work in prgress!$${RESET}"
endif

# SITE RULES

site_publish:
	bash site/publish.sh \
		--build \
		--commit \
		--push

# INFRASTRUCTURE RULES
bin_install:
	if ! command -v npm &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}npm$${RED}. See $${YELLOW}https://docs.npmjs.com/downloading-and-installing-node-js-and-npm${RED}.$${RESET}" && exit 1; fi
	if ! command -v tidy &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}tidy$${RED} from $${YELLOW}https://www.html-tidy.org/${RED}.$${RESET}" && exit 1; fi
	if ! command -v magick &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}magick$${RED} from $${YELLOW}https://imagemagick.org/${RED}.$${RESET}" && exit 1; fi
	if ! command -v gh &> /dev/null; then echo -e "$${RED}Please install $${YELLOW}gh$${RED} from $${YELLOW}https://cli.github.com/${RED}.$${RESET}" && exit 1; fi
	if ! command -v say &> /dev/null; then echo -e "$${YELLOW}Consider installing $${CYAN}say$${YELLOW}. This should be possible with $${CYAN}sudo apt-get install gnustep-gui-runtime$${YELLOW} on Ubuntu.$${RESET}"; fi


npm_install:
	npm install \
		--save-dev \
		"typescript"

pip_install: requirements.txt
	python -m pip install --upgrade pip
	python -m pip install -r requirements.txt

pip_update: FORCE
	pip-review --local --auto

python_install:
	python -m pip install -e .

precommit_install:
	pre-commit install

_add _test: FORCE
	until git add --all && pre-commit run; do : ; done

precommit_update: FORCE
	pre-commit autoupdate

git_clean: FORCE
	git clean \
		-x \
		-d \
		--exclude "flashcards/data/output/anki/coptic.apkg" \
		--exclude ".env" \
		--force

git_status: FORCE
	git status --short

git_diff: FORCE
	git diff --cached --word-diff

stats_report: FORCE
	bash stats.sh

stats_save: FORCE
	bash stats.sh --save

_stats_format: FORCE
	python -c $$'import utils\n\
	utils.to_tsv(utils.read_tsv("data/stats.tsv"), "data/stats.tsv")'

camera_images: FORCE
	grep \
		--invert \
		-E "^manual$$|^http.*$$" \
		-R "dictionary/marcion.sourceforge.net/data/img-sources" \
		| grep -oE "[^/]+$$" \
		| sed 's/\.txt:/ /' \
		| awk '{ printf "\033[32m%-15s\t\033[31m%-15s\033[0;39m\n", $$1, $$2 }'

	grep \
		--invert \
		-E "^manual$$|^http.*$$" \
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
