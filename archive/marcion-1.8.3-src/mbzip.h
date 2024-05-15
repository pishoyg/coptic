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

#ifndef MBZIP_H
#define MBZIP_H

#include <QString>
#include <QFile>

#include <stdio.h>
#include <bzlib.h>

#include "messages.h"
#include "settings.h"

class CMBzip
{
public:
    CMBzip(QString const & filename,
           CMessages * const messages);
    bool decompress(QString const & target=QString()) const;
    bool compress(QString const & target=QString()) const;
    bool compressToTmpdir(QString & result_name) const;
private:
    QString filename;
    CMessages * const messages;
};

#endif // MBZIP_H
