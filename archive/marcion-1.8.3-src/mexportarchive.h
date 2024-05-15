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

#ifndef MEXPORTARCHIVE_H
#define MEXPORTARCHIVE_H

#include <QDialog>
#include <QFileDialog>

#include "settings.h"

namespace Ui {
class MExportArchive;
}

class MExportArchive : public QDialog
{
    Q_OBJECT

public:
    explicit MExportArchive(bool export_mode=true,QWidget *parent = 0);
    ~MExportArchive();

    bool exportData() const;
    bool exportIndex() const;
    bool exportAuthors() const;
    bool exportCategories() const;
    QString exportFilename() const;
    bool compress() const;
private slots:
    void on_btFile_clicked();
    void on_txtFile_textChanged(const QString &arg1);
private:
    Ui::MExportArchive *ui;

    QString const _default_dir,_default_filename;
    bool _export_mode;
};

#endif // MEXPORTARCHIVE_H
