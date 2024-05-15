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

#ifndef MDOWNLOADWEB_H
#define MDOWNLOADWEB_H

#include <QWidget>
#include <QAbstractButton>
#include <QProcess>
#include <QFileDialog>
#include <QCloseEvent>
#include <QUrl>

#include "filechooser.h"
#include "libbase.h"

namespace Ui {
    class MDownloadWeb;
}

class MDownloadWeb : public QWidget {
    Q_OBJECT
public:
    MDownloadWeb(CMessages * const,QDir const &,
                 CLibBase & lib,QWidget *parent = 0);
    ~MDownloadWeb();

    QString webLoc() const;
    //bool isDirUnchanged() const;
    QString targetDir() const;
protected:
    void closeEvent(QCloseEvent *event);
private:
    Ui::MDownloadWeb *ui;

    CMessages * const messages;
    QProcess _p;
    //QDir const _libdir;
    //bool _progress;
    bool test;
    QString epars;
    CLibBase & lib;
    bool inProgress() const;

private slots:
    void on_textBrowser_anchorClicked(QUrl );
    void on_btClose_clicked();
    void on_btState_clicked();
    void on_btBrowse_clicked();
    void on_rbFile_toggled(bool checked);
    void on_rbWeb_toggled(bool checked);
    void on_treeSites_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* previous);
    void on_btRec_clicked(bool checked);
    void on_btVersion_clicked();
    void on_btDetails_toggled(bool checked);
    void on_btDefault_clicked();
    void on_btTest_clicked();
    //void on_txtDir_textChanged(QString );
    //void on_btChooseDir_clicked();
    void on_btClear_clicked();
    void on_btStop_clicked();
    void on_btStart_clicked();
    void on_wdgDir_viewInLibrary(QString);

    void slot_downloadFinished(int exitCode, QProcess::ExitStatus exitStatus);
    void slot_downloadError();
    void slot_downloadOutput();
};

#endif // MDOWNLOADWEB_H
