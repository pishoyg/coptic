import unittest

import field


class TestTxt(unittest.TestCase):

    def test_txt(self):
        t = field.txt("hello")
        self.assertEqual(t.next(), "hello")
        self.assertEqual(t.length(), -1)
        self.assertEqual(t.media_files(), [])
        self.assertEqual(t.str(), "hello")


if __name__ == "__main__":
    unittest.main()
