import unittest

from utils import printer


class TestPrinter(unittest.TestCase):

    def test_printer(self):
        printer.green("test")


if __name__ == "__main__":
    unittest.main()
