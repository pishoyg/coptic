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

#ifndef EXPORTTR_H
#define EXPORTTR_H

#include <QDialog>
#include <QFileDialog>
#include <QDir>
#include <QFileInfo>

namespace Ui {
    class CExportTr;
}

class CExportTr : public QDialog {
    Q_OBJECT
public:
    CExportTr(QWidget *parent = 0);
    ~CExportTr();

    bool langEn() const,langCz() const, longTr() const;

    bool linksToWWW() const;

    void setEn(bool);
    void setFilename(QString const &);
    QString filename() const,robots() const;

    QString tblBgColor() const;
    QString tblFgColor() const;
    QString hdrBgColor() const;
    QString hdrFgColor() const;
    QString textBgColor() const;
    QString textFgColor() const;
    QString itemBgColor() const;
    QString itemFgColor() const;
protected:
    void changeEvent(QEvent *e);

private:
    Ui::CExportTr *ui;

private slots:
    void on_btChooseFile_clicked();
};

#endif // EXPORTTR_H
