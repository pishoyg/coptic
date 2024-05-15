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

#ifndef LIBBASE_H
#define LIBBASE_H

#include <QString>
#include <QDir>
#include <QTreeWidget>

class CLibBase
{
public:
    CLibBase();
    virtual void openMysqlBook(int,int,int,int)=0;
    virtual bool findHtmlItem(QDir const &)=0;
    virtual void activate()=0;
    virtual void getSimulBooks(QTreeWidget*) const=0;
};

#endif // LIBBASE_H
