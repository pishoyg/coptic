#!/usr/bin/env python3
import constants


def main():
    for index in constants.INDEXES:
        index.build()


if __name__ == "__main__":
    main()
