/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

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
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#include "worditem.h"
//
CWordItem::CWordItem(int key,int key_word,int pos,
QString const & word,
QString const & anchor,Type type,unsigned short wtype )
: _key(key),_key_word(key_word),_pos(pos),
        _word(word),_anchor(anchor),_type(type),_wtype(wtype)
{

}
CWordItem::CWordItem(CWordItem const & other)
: _key(other._key),_key_word(other._key_word),
_pos(other._pos),
_word(other._word),_anchor(other._anchor),_type(other._type),
_wtype(other._wtype)
{

}
CWordItem const & CWordItem::operator=(CWordItem const & other)
{
	*(int*)&_key=other._key;
	*(int*)&_key_word=other._key_word;
	*(int*)&_pos=other._pos;
	*(QString*)&_word=other._word;
	*(QString*)&_anchor=other._anchor;
	*(Type*)&_type=other._type;
        *(unsigned short*)&_wtype=other._wtype;

	return *this;
}
//
QString const & CWordItem::word() const
{
	return _word;
}
QString const & CWordItem::anchor() const
{
	return _anchor;
}
int CWordItem::key() const
{
	return _key;
}
int CWordItem::key_word() const
{
	return _key_word;
}
int CWordItem::pos() const
{
	return _pos;
}
int CWordItem::type() const
{
	return _type;
}
unsigned short CWordItem::wtype() const
{
        return _wtype;
}
