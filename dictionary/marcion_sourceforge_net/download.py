#!/usr/bin/env python3
"""Download the Crum sheet to local TSV files."""

from dictionary.marcion_sourceforge_net import tsv
from utils import gcloud


def main():
    gcloud.to_tsv(tsv.roots_sheet(), tsv.WRD)
    gcloud.to_tsv(tsv.derivations_sheet(), tsv.DRV)


if __name__ == "__main__":
    main()
