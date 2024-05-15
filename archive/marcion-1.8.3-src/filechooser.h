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

#ifndef FILECHOOSER_H
#define FILECHOOSER_H

#include <QWidget>
#include <QFileDialog>

#include "messages.h"
#include "settings.h"

namespace Ui {
    class MFileChooser;
}

class MFileChooser : public QWidget
{
    Q_OBJECT

public:
    explicit MFileChooser(QWidget *parent = 0);
    ~MFileChooser();

    QString targetDir(bool separators=false) const;
    void setTargetDir(QString const & dir);
    void init(CMessages * const,QString const &,QDir const &,bool goto_button_is_visible=true,bool show_info=true);
    void setCurDir(),cleanCurDir();
    QString curDir();
    void setRelativeToLibrary(bool is_relative);
    //void showMessage(QString const & message);
    QString relativeToLibrary(QString const & path);
    static QString relativeToLibrary(QString const & path,bool relative);
    static bool isInMLib(QString const & path);
private:
    Ui::MFileChooser *ui;
    QString usedDir;
    bool _relative;
    CMessages * const messages;
private slots:
    void on_btView_clicked();
    void on_txtDir_textChanged(QString );
    void on_btChooseDir_clicked();
    void on_cbEdit_clicked(bool checked);

signals:
    void viewInLibrary(QString);
    void pathChanged(QString newpath);
};

#endif // FILECHOOSER_H
