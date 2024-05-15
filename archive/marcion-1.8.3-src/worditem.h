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

#ifndef WORDITEM_H
#define WORDITEM_H
//
#include <QString>
//
class CWordItem
{

public:
	enum Type{
		Word,Derivation
	};
	CWordItem(int key,int key_word,int pos,
        QString const & word,QString const & anchor,Type type,unsigned short wtype);
	CWordItem(CWordItem const & other);

	QString const & word() const;
	QString const & anchor() const;
	int key() const;
	int key_word() const;
	int pos() const;
        unsigned short wtype() const;
	int type() const;

	CWordItem const & operator=(CWordItem const & other);
private:
        const int _key,_key_word,_pos;
	const QString _word,_anchor;
	const Type _type;
        unsigned short _wtype;
};
#endif
