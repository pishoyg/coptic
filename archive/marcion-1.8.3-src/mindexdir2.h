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

#ifndef MINDEXDIR2_H
#define MINDEXDIR2_H

#include <QWidget>
#include <QDir>
#include <QProcess>
#include <QMessageBox>
#include <QCloseEvent>
#include <QUrl>

#include "filechooser.h"
#include "libbase.h"

namespace Ui {
    class MIndexDir2;
}

class MIndexDir2 : public QWidget
{
    Q_OBJECT

public:
    explicit MIndexDir2(CMessages * const,
                        QDir const &,
                        CLibBase & lib,
                        QWidget *parent = 0);
    ~MIndexDir2();

    QString targetDir() const;
private:
    Ui::MIndexDir2 *ui;
    CMessages * const messages;
    QProcess _p;
    CLibBase & lib;
    bool inProgress() const;
protected:
    void closeEvent(QCloseEvent *event);
private slots:
    void on_txtOutput_anchorClicked(QUrl );
    void on_btState_clicked();
    void on_btHelp_clicked();
    void on_btVersion_clicked();
    void on_btClear_clicked();
    void on_btStop_clicked();
    void on_btStart_clicked();
    void on_btClose_clicked();
    void on_wdgDir_viewInLibrary(QString dirname);

    void slot_downloadFinished(int exitCode, QProcess::ExitStatus exitStatus);
    void slot_downloadError();
    void slot_downloadOutput();
};

#endif // MINDEXDIR2_H
