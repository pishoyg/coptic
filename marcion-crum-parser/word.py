"""

Developer contact: b.g.coptic@gmail.com.
Inquiries are welcome :)

Copyright (C) 2020

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
"""

class word():
  _forms = None


class form():
  _spellings = None
  _types = None
  _dialects = None
  _references = None


class spelling():
  _confirmed = None


class type():
  _coptic_symbol = None
  _full_name = None
  _abbreviation = None


class type():
  _coptic_symbol = None
  _description = None

  def __init__(self, coptic_symbol, description):
    assert isinstance(coptic_symbol, str)
    assert isinstance(description, str)
    
    self._coptic_symbol = coptic_symbol
    self._description = description

  def coptic_symbol(self):
    return self._coptic_symbol

  def description(self):
    return self._description

class structured_word():
  _dialects = None
  _spellings = None
  _types = None
  _references = None
  
  def __init__(self, dialects, spellings, types, references):
    assert isinstance(dialects, list) and all(isinstance(i, str) for i in dialects)
    assert isinstance(spellings, list) and all(isinstance(i, str) for i in spellings)
    assert isinstance(types, list) and all(isinstance(i, type) for i in types)
    assert isinstance(references, list) and all(isinstance(i, str) for i in references)
    self._dialects = dialects
    self._spellings = spellings
    self._types = types
    self._references = references

  def is_dialect(self, d):
    return d in self._dialects
  
  def __str__(self):
    d = '({}) '.format(', '.join(self._dialects)) if self._dialects else ''
    return d + self.undialected_str()
  
  def undialected_str(self):
    return ' '.join(filter(None, [
        ', '.join(self._spellings),
        ' '.join(i.coptic_symbol() for i in self._types),
        ' '.join(self._references)
    ]))
  
  def dialects(self):
    return self._dialects

