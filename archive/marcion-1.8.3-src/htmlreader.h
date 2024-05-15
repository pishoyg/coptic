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

#ifndef HTMLREADER_H
#define HTMLREADER_H

#include "mdocumentbase.h"
#include "textbrowserext.h"
#include "mwindowswidget.h"

#include <QWidget>
#include <QTextCodec>

namespace Ui {
    class CHtmlReader;
}

class CHtmlReader : public QWidget, public MDocumentBase {
    Q_OBJECT
public:
    friend class MContentBook;
    CHtmlReader(QWidget *parent = 0);
    CHtmlReader(QString const & title,QString const & filename,
                CBookTextBrowser::Script script,
                QString const & show_text=QString(),
                QWidget *parent = 0);
    ~CHtmlReader();

    void init(QString const & title,QString const & filename,
              CBookTextBrowser::Script script,
              QString const & show_text=QString(),
              bool allow_font=false);

    void goHome();
    void loadPage(QUrl const &);
protected:
    //void changeEvent(QEvent *e);
    CTextBrowserExt * browser();
private:
    Ui::CHtmlReader *ui;
    QUrl _home;
    static QList<QByteArray> _charsets;
protected:
    //CMessages * const messages;

    void disableCharset();

    void keyPressEvent(QKeyEvent * event);
private slots:
    void on_btReload_clicked();
    void on_btZoomOut_clicked();
    void on_btZoomIn_clicked();
    void on_btShowPanel_clicked();
    void on_btNext_clicked();
    void on_btPrev_clicked();
    void on_btHome_clicked();

    void on_brContent_historyFBChanged(int,bool);
    void on_grpCharset_toggled(bool arg1);
    void on_cmbCharset_activated(int );

    void slot_anchorClicked(QUrl url);
};

#endif // HTMLREADER_H
