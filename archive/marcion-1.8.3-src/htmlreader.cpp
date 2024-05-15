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

#include "htmlreader.h"
#include "ui_htmlreader.h"

QList<QByteArray> CHtmlReader::_charsets(QTextCodec::availableCodecs());

CHtmlReader::CHtmlReader(QWidget *parent) :
    QWidget(parent),
    MDocumentBase(MDocumentBase::Html),
    ui(new Ui::CHtmlReader),
    _home()
{
    ui->setupUi(this);
}

CHtmlReader::CHtmlReader(QString const & title,
                         QString const & filename,
                         CBookTextBrowser::Script script,
                         QString const & show_text,
                         QWidget *parent) :
    QWidget(parent),
    MDocumentBase(MDocumentBase::Html),
    ui(new Ui::CHtmlReader),
    _home(QUrl::fromLocalFile(filename))
{
    ui->setupUi(this);

    ui->btNext->setEnabled(false);
    ui->btPrev->setEnabled(false);

    ui->brContent->init(title,script,false);
    ui->brContent->browser()->setOpenLinks(true);
    ui->brContent->browser()->setOpenExternalLinks(false);
    ui->brContent->allowChangeScript();

    for(int x=0;x<_charsets.count();x++)
        ui->cmbCharset->addItem(QString::fromUtf8(_charsets.at(x)),_charsets.at(x));

    goHome();

    if(!show_text.isEmpty())
    {
        ui->brContent->setPanelVisibility(true);
        ui->brContent->inputBox().setText(show_text);
    }

    ui->brContent->browser()->setOpenLinks(false);
    connect(ui->brContent->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(slot_anchorClicked(QUrl)));

    IC_SIZES
}

CHtmlReader::~CHtmlReader()
{
    RM_WND;
    delete ui;
}

void CHtmlReader::init(QString const & title,QString const & filename,
          CBookTextBrowser::Script script,
          QString const & show_text,
          bool allow_font)
{
    _home=QUrl::fromLocalFile(filename);

    ui->btNext->setEnabled(false);
    ui->btPrev->setEnabled(false);

    ui->brContent->init(title,script,allow_font);
    ui->brContent->browser()->setOpenLinks(true);
    ui->brContent->browser()->setOpenExternalLinks(false);
    ui->brContent->allowChangeScript();

    goHome();

    if(!show_text.isEmpty())
    {
        ui->brContent->setPanelVisibility(true);
        ui->brContent->inputBox().setText(show_text);
    }
}

/*void CHtmlReader::changeEvent(QEvent *e)
{
    QWidget::changeEvent(e);
    switch (e->type()) {
    case QEvent::LanguageChange:
        ui->retranslateUi(this);
        break;
    default:
        break;
    }
}*/

void CHtmlReader::goHome()
{
    loadPage(_home);
}

void CHtmlReader::loadPage(QUrl const & u)
{
    if(ui->grpCharset->isChecked())
    {
        QString const fn=u.toLocalFile();
        m_msg()->MsgMsg(tr("opening page ")+fn+" ...");
        ui->brContent->browser()->setSource(u);
        QFile f(fn);
        if(f.open(QIODevice::ReadOnly))
        {
            QByteArray ba=f.readAll();
            f.close();

            int const ci=ui->cmbCharset->currentIndex();
            if(ci>-1)
            {
                QTextCodec *tc=QTextCodec::codecForName(ui->cmbCharset->itemData(ci).toByteArray());
                if(tc)
                    ui->brContent->browser()->setHtml(tc->toUnicode(ba));
            }
        }
    }
    else
    {
                m_msg()->MsgMsg(tr("opening page ")+u.toString()+" ...");
                ui->brContent->browser()->setSource(u);
    }
}

void CHtmlReader::on_btHome_clicked()
{
    ui->brContent->header()->setDocMode();

    goHome();
}

void CHtmlReader::on_btPrev_clicked()
{
    ui->brContent->header()->setDocMode();

    ui->brContent->browser()->backward();
    if(ui->grpCharset->isChecked())
        loadPage(ui->brContent->browser()->source());
}

void CHtmlReader::on_btNext_clicked()
{
    ui->brContent->header()->setDocMode();

    ui->brContent->browser()->forward();
    if(ui->grpCharset->isChecked())
        loadPage(ui->brContent->browser()->source());
}

void CHtmlReader::on_btShowPanel_clicked()
{
    ui->brContent->header()->setDocMode();

    ui->brContent->findSelected();
}

void CHtmlReader::on_btZoomIn_clicked()
{
    ui->brContent->header()->setDocMode();

    ui->brContent->browser()->zoomIn(1);
}

void CHtmlReader::on_btZoomOut_clicked()
{
    ui->brContent->header()->setDocMode();

    ui->brContent->browser()->zoomOut(1);
}

CTextBrowserExt * CHtmlReader::browser()
{
    return ui->brContent;
}

void CHtmlReader::on_btReload_clicked()
{
    ui->brContent->header()->setDocMode();

    ui->brContent->beforeReload();

    if(ui->grpCharset->isChecked())
        loadPage(ui->brContent->browser()->source());
    else
        ui->brContent->browser()->reload();
}

void CHtmlReader::on_brContent_historyFBChanged(int direction,bool available)
{
    switch(direction)
    {
    case CBookTextBrowser::Forward :
        ui->btNext->setEnabled(available);
        break;
    case CBookTextBrowser::Backward :
        ui->btPrev->setEnabled(available);
        break;
    }
}

void CHtmlReader::keyPressEvent(QKeyEvent * event)
{
    event->ignore();
    ui->brContent->keyPressEvent(event);
    if(!event->isAccepted())
        QWidget::keyPressEvent(event);
}

void CHtmlReader::on_grpCharset_toggled(bool arg1)
{
    ui->brContent->header()->setDocMode();

    ui->cmbCharset->setEnabled(arg1);
    on_cmbCharset_activated(-1);
}

void CHtmlReader::on_cmbCharset_activated(int )
{
    ui->brContent->header()->setDocMode();
    loadPage(ui->brContent->browser()->source());
}

void CHtmlReader::slot_anchorClicked(QUrl url)
{
    ui->brContent->header()->setDocMode();
    loadPage(url);
}

void CHtmlReader::disableCharset()
{
    ui->grpCharset->setVisible(false);
}
