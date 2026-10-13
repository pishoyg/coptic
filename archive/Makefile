crum_scan:
	# Download Crum's scan.
	./dictionary/marcion_sourceforge_net/download_scan.sh "/tmp/crum"
	./convert.sh "/tmp/crum" "docs/crum/crum" "-crop" "3768x5584+270+60" "+repage"

# Extract one image per PDF page, in the page range $(3)–$(4) of PDF $(1),
# convert it to monochrome, and save it under `docs/kasser/$(2)/`, named
# sequentially starting from 0.
# Before thresholding, we divide the page by an estimate of its background
# (the page with the text dilated away and blurred), to flatten uneven lighting.
# Otherwise, shadows and darker paper turn into large black areas.
# We then crop the page to its content, plus a small padding, but no smaller
# than $(5)x$(6) (the largest content box in the book, so all pages come out the
# same size). The content is centered horizontally and kept at the top. To find
# the content's bounding box, we downscale the page by 10x, so that faint specks
# fade out, then drop the small blobs that remain. A page with no content left
# (a blank page) is cropped around its center.
# `KASSER_ERASE_$(2)` lists rectangles to whiten before cropping, as
# `PAGE:X0,Y0,X1,Y1` (in the uncropped page's coordinates), to erase marks
# that aren't content.
define kasser_scan
	set -o errexit; : "$(1)"; \
	TMP="$$(mktemp -d)"; \
	PAD=40; \
	mkdir -p "docs/kasser/$(2)"; \
	for PAGE in $$(seq $(3) $(4)); do \
		PNG="docs/kasser/$(2)/$$((PAGE - $(3))).png"; \
		pdfimages -all -f "$${PAGE}" -l "$${PAGE}" "$(1)" "$${TMP}/img"; \
		magick "$${TMP}"/img-000.* \
			-strip \
			-colorspace gray \
			\( +clone -morphology Dilate Octagon:4 -blur 0x20 \) \
			-compose Divide_Src -composite \
			-threshold 75% \
			"$${PNG}"; \
		rm "$${TMP}"/img-*; \
		for ERASE in $(KASSER_ERASE_$(2)); do \
			if [ "$${ERASE%%:*}" = "$$((PAGE - $(3)))" ]; then \
				magick "$${PNG}" \
					-fill white -draw "rectangle $${ERASE#*:}" "$${PNG}"; \
			fi; \
		done; \
		set -- $$(magick "$${PNG}" -scale 10% -threshold 90% \
			-define connected-components:area-threshold=4 \
			-define connected-components:mean-color=true \
			-connected-components 8 \
			-format '%@' info: 2>/dev/null | tr 'x+' '  '); \
		if [ "$$1" -gt 0 ]; then \
			W="$$(($$1 * 10 + 2 * PAD))"; W="$$((W > $(5) ? W : $(5)))"; \
			H="$$(($$2 * 10 + 2 * PAD))"; H="$$((H > $(6) ? H : $(6)))"; \
			X="$$((($$3 * 2 + $$1) * 5 - W / 2))"; Y="$$(($$4 * 10 - PAD))"; \
			GRAVITY=northwest; GEOMETRY="$${W}x$${H}+$${X}+$${Y}"; \
		else \
			GRAVITY=center; GEOMETRY="$(5)x$(6)"; \
		fi; \
		magick "$${PNG}" \
			-strip \
			-background white \
			-gravity "$${GRAVITY}" \
			-extent "$${GEOMETRY}" \
			"$${PNG}"; \
	done; \
	rmdir "$${TMP}"
endef

# A scribble in the right margin.
KASSER_ERASE_complements := 142:2180,1540,2332,1680

kasser_scan:
	# Convert Kasser's scans to PNG.
	# - Compléments au dictionnaire copte de Crum (IFAO, 1964).
	# - Compléments morphologiques au dictionnaire de Crum (BIFAO 64, 1966).
	# Set `KASSER_COMPLEMENTS_PDF` and `KASSER_MORPHOLOGIQUES_PDF` to the PDFs.
	$(call kasser_scan,$${KASSER_COMPLEMENTS_PDF:?},complements,7,159,2060,3000)
	$(call kasser_scan,$${KASSER_MORPHOLOGIQUES_PDF:?},morphologiques,2,49,1840,2510)
