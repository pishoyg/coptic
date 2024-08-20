SHELL := /bin/bash

# .env
#
# N.B. Some rules require the environment variables to be exported.
# See .env_INFO.

# LEVELS
#
# Level-3 rules use level-2 rules.
# Level-2 rules use level-1 rules.

# LEVEL 3 RULES ###############################################################

.PHONY: all
# You might want to run `make clean` following this.
all: install compile generate_1 test_1 generate_2 test publish report

# LEVEL 2 RULES ###############################################################

.PHONY: install
install: pip_install python_install precommit_install bin_install ts_install

.PHONY: compile
compile: ts_compile

# generate_1 rules are prerequisites for generate_2 rules.
.PHONY: generate_1
generate_1: bible copticsite crum crum_appendices crum_img kellia kellia_analysis

.PHONY: generate_2
generate_2: flashcards kindle

# NOTE: We have to duplicate the rules, otherwise Make would deduplicate a rule
# called twice in a recipe.
.PHONY: test
test: git_add_precommit_run

.PHONY: test_1
test_1: git_add_precommit_run_1

.PHONY: publish
publish: anki_publish epub_publish site_publish

.PHONY: report
report: stats_report

# The following level-2 rules are not included in any of the level-3 rules
# above. This is because they are mainly relevant during development, but are
# not part of the main deployment pipeline.

.PHONY: flashcards_crum_all_dialects
flashcards_crum_all_dialects: _flashcards_crum_all_dialects

.PHONY: flashcards_copticsite
flashcards_copticsite: _flashcards_copticsite

.PHONY: flashcards_kellia
flashcards_kellia: _flashcards_kellia

.PHONY: bible_no_epub
bible_no_epub: bible_no_epub_aux

.PHONY: site_commit
site_commit: _site_commit

.PHONY: site_push
site_push: _site_push

.PHONY: stats
stats: stats_save

.PHONY: clean
clean: git_clean bible_epub_clean kellia_analysis_clean

.PHONY: status
status: git_status

.PHONY: diff
diff: git_diff

.PHONY: toil
toil: crum_img_helper

.PHONY: todo
todo: todo_grep

.PHONY: precommit
precommit: precommit_run

.PHONY: update
update: precommit_update pip_update

.PHONY: camera
camera: camera_images

.PHONY: yo
yo: say_yo

.PHONY: env_backup
env_backup: env_cp_to_home

.PHONY: env_restore
env_restore: env_cp_from_home

# LEVEL 1 RULES ###############################################################

ts_compile: FORCE
	npx tsc -p "flashcards/constants/a_coptic_dictionary/tsconfig.json"

# BIBLE RULES
bible: FORCE
	python bible/stshenouda.org/main.py

bible_no_epub_aux: FORCE
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
	# Verify the senses have valid JSON.
	# TODO: JQ simply drops duplicate keys. You should verify their absence
	# instead.
	for BASENAME in "root_appendices.tsv" "derivation_appendices.tsv"; do \
		cut \
			--fields 5 \
			"dictionary/marcion.sourceforge.net/data/input/$${BASENAME}" \
			| tail -n +2  \
			| grep --invert -E '^[[:space:]]*$$' \
			| sed 's/""/"/g' \
			| sed 's/"//' \
			| rev | sed 's/"//' | rev \
			| jq .; done

crum_img: $(shell find dictionary/marcion.sourceforge.net/data/ -type f)
	python dictionary/marcion.sourceforge.net/img_helper.py --batch

crum_img_helper: FORCE
	# TODO: Remove the filters. Do all the words.
	python dictionary/marcion.sourceforge.net/img_helper.py \
		--skip_existing=true \
		--exclude "type-parsed:verb" "dialect-B:" \
		--start_at_key="$${START_AT_KEY}" \
		--thenounproject_key="$${THENOUNPROJECT_KEY}" \
		--thenounproject_secret="$${THENOUNPROJECT_SECRET}"

# KELLIA RULES
kellia: FORCE
	python dictionary/kellia.uni-goettingen.de/main.py

kellia_analysis: FORCE
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
		--html_mask "true" \
		--tsvs_mask ""

_flashcards_copticsite: FORCE
	python flashcards/main.py \
		--decks "copticsite.com" \
		--output_dir "/tmp/" \
		--anki "/tmp/anki/copticsite.apkg" \
		--html_mask "true" \
		--tsvs_mask ""

_flashcards_kellia: FORCE
	python flashcards/main.py \
		--decks "KELLIA::Comprehensive" "KELLIA::Egyptian" "KELLIA::Greek"\
		--output_dir "/tmp/" \
		--anki "/tmp/anki/kellia.apkg" \
		--html_mask "true" "true" "true" \
		--tsvs_mask "" "" ""

# KINDLE RULES
# TODO: Restore the rules (with appropriate paths) once the pipeline is
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

# N.B. `make site_publish` (currently accomplished by
# `bash site/publish.sh --auto`) should be equivalent to
# `make site_commit site_push`.
site_publish: FORCE
	bash site/publish.sh --auto

_site_commit: FORCE
	bash site/publish.sh

_site_push: FORCE
	git -C "$${SITE_DIR}" rebase --root --autosquash
	git -C "$${SITE_DIR}" push --force

# INFRASTRUCTURE RULES
bin_install:
	if ! command -v npm &> /dev/null; then echo "Please install npm. See https://docs.npmjs.com/downloading-and-installing-node-js-and-npm.html-tidy.org/." && exit 1; fi
	if ! command -v tidy &> /dev/null; then echo "Please install tidy from https://www.html-tidy.org/." && exit 1; fi
	if ! command -v magick &> /dev/null; then echo "Please install magick from https://imagemagick.org/." && exit 1; fi

ts_install:
	npm install typescript --save-dev

pip_install: requirements.txt
	python -m pip install --upgrade pip
	python -m pip install -r requirements.txt

pip_update: FORCE
	pip-review --local --auto

python_install:
	python -m pip install -e .

precommit_install:
	pre-commit install

precommit_run: FORCE
	pre-commit run

git_add_precommit_run git_add_precommit_run_1: FORCE
	until git add --all && pre-commit run; do : ; done

env_cp_to_home: FORCE
	cp .env "$${HOME}/.env_coptic"

env_cp_from_home: FORCE
	cp "$${HOME}/.env_coptic" .env

precommit_update: FORCE
	pre-commit autoupdate

todo_grep: FORCE
	grep TODO -R . --exclude-dir="archive" --exclude-dir=.git

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

# TODO: This works on OS X, but it doesn't exist by default on Ubuntu.
say_yo: FORCE
	say yo

# LEVEL-0 rules ###############################################################

# FORCE
.PHONY: FORCE
FORCE:
