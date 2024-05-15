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

#ifndef PROGRESSDIALOG_H
#define PROGRESSDIALOG_H

#include <QDialog>
#include <QMessageBox>
#include <QCloseEvent>

#include "settings.h"

namespace Ui {
    class CProgressDialog;
}

class CProgressDialog : public QDialog {
    Q_OBJECT
public:
    CProgressDialog(QWidget *parent = 0);
    ~CProgressDialog();

    void initProgress(QString const &, int maximum,bool short_format=false);
    void incProgress();
    void setProgress(int value);
    void setProgress(int value,int maximum);
    int  maximum() const;
    void setTitle(QString const &);
    void processEvents() const;
    bool stopped() const;
    void restart();
    bool close();
protected:
    void changeEvent(QEvent *e);
    void closeEvent ( QCloseEvent * event );
private:
    Ui::CProgressDialog *ui;

    bool _stopped,_closeForced;

private slots:
    void on_btStop_clicked();
};

#endif // PROGRESSDIALOG_H
