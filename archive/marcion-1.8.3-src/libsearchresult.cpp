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

#include "libsearchresult.h"
#include "ui_libsearchresult.h"

//

QString CLibSearchResult::form="<table style=\"text-align: left; width: 1000px; height: 31px;\" border=\"1\" cellpadding=\"0\" cellspacing=\"0\"><tbody><tr><td style=\"vertical-align: top;\">**num**</td><td style=\"vertical-align: top;\"><a href=\"book(*)(*name*)(*)(*id*)(*)(*sc*)(*)(*chapter*)(*)(*verse*)(*)(*fmt*)\">**loc**</td><td style=\"vertical-align: top;\">**col**</td></tr><tr><td colspan=\"3\" rowspan=\"1\" style=\"vertical-align: top;\">**txt**</td></tr></tbody></table>";

CLibSearchResult::CLibSearchResult(QString const & str, CMessages * const messages,CTranslit::Script script,DataType data_type,QWidget *parent) :
        QWidget(parent),
    ui(new Ui::CLibSearchResult),
    messages(messages),script(script),store(),data_type(data_type){
    ui->setupUi(this);

    connect(ui->widget->browser(),SIGNAL(anchorClicked(QUrl)),this,SLOT(w_anchorClicked(QUrl)));

    setWindowTitle(tr("search result | ")+str);
    ui->widget->init(windowTitle(),(CBookTextBrowser::Script)script);
    ui->widget->browser()->clear();
    ui->widget->inputBox().setText(str);

    IC_SIZES
}

CLibSearchResult::~CLibSearchResult()
{
    delete ui;
}

//

CBookTextBrowser & CLibSearchResult::textBrowser(){return *ui->widget;}
void CLibSearchResult::setFont(QFont font){ui->widget->setFont(font);}

/*void CLibSearchResult::appendItem(QString const & coll,
                    QString const & loc,
                    QString const & text,
                    QString const & num,
                    QString const & id,
                    QString const & sc,
                    QString const & fmt,
                    QString const & name,
                    QString const & chapter,
                    QString const & verse)
{
    QString item(form);
    item.replace("**col**",coll);
    item.replace("**num**",num);
    item.replace("**loc**",loc);
    item.replace("**txt**",text);
    item.replace("(*id*)",id);
    item.replace("(*sc*)",sc);
    item.replace("(*fmt*)",fmt);
    item.replace("(*name*)",name);
    item.replace("(*chapter*)",chapter);
    item.replace("(*verse*)",verse);

    widget->browser()->append(item);
}*/

/*void CLibSearchResult::readSwishOutput()
{
    widget->browser()->append(swish_p.readAll());
}*/

void CLibSearchResult::w_anchorClicked(QUrl url)
{
    switch(data_type)
    {
    case Html :
    {
        QString const filename(QFileInfo(url.toString()).absoluteFilePath());
        CLibraryWidget::openHtmlBook(messages,filename,CLibraryWidget::Auto,ui->widget->inputBox().text());
        break;
    }
    case MySql :
    {
        QString action=url.toString();
        QStringList l(action.split("(*)"));
        if(l[0]=="book")
        {
            int const book=l[2].toInt(),
                chapter=l[4].toInt(),
                verse=l[5].toInt(),
                format=l[6].toInt(),
                script=l[3].toInt();

            QString const name(l.at(1));

            MVersedBook * b=new MVersedBook(name,(MVersedBook::Script)script,(MVersedBook::TextFormat)format,book,ui->widget->inputBox().text());
            if(b)
            {
                //messages->settings().mdiArea()->addSubWindow(b)->setWindowIcon(QIcon(":/new/icons/icons/book.png"));

                b->findVerse(chapter,verse);
                b->show();
                //b->activateWindow();

                m_sett()->wnds()->addNewWindow(b);
                CSettings::recentFiles.prependFileItem(MFileItem(name,book,0,0,script));
            }
        }
        break;
    }
    case Archive :
    {
        QString const filename(QFileInfo(url.toString()).absoluteFilePath());
        if(!CLibraryWidget::openHtmlBook(messages,filename,CLibraryWidget::Auto,ui->widget->inputBox().text()))
            m_msg()->MsgErr(tr("File '")+filename+tr("' cannot be opened. Try to restore it from database."));
        break;
    }
    }
}
/*void CLibSearchResult::appendLine(QString const & line)
{
    widget->browser()->append(line);
}*/
void CLibSearchResult::goToTop()
{
    ui->widget->browser()->moveCursor(QTextCursor::Start);
}

void CLibSearchResult::append(QString const & text)
{
    ui->widget->browser()->insertHtml(text);
}

void CLibSearchResult::displayStore()
{
    ui->widget->browser()->clear();

    QString atxt(store.init_line);
    for(int x=0;x<store.count;x++)
    {
        QString item(messages->settings().libsearchresTblTemplate()),
            mtext(store.text[x]);
        if(ui->widget->rmSpaces()||ui->widget->rmAccents())
        {
            switch(script)
            {
                case CTranslit::Latin :
                mtext=CTranslit::tr(mtext,CTranslit::LatinNToLatinTr,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::LatinTrToLatinN,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                break;
                case CTranslit::Greek :
                mtext=CTranslit::tr(mtext,CTranslit::GreekNToGreekTr,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::GreekTrToGreekN,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                break;
                case CTranslit::Copt :
                mtext=CTranslit::tr(mtext,CTranslit::CopticNToCopticTr,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::CopticTrToCopticN,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                break;
                case CTranslit::Hebrew :
                mtext=CTranslit::tr(mtext,CTranslit::HebrewNToHebrewTr,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                mtext=CTranslit::tr(mtext,CTranslit::HebrewTrToHebrewN,ui->widget->rmAccents(),ui->widget->rmSpaces2());
                break;
            }
        }

        /*if(widget->isHighlightChecked())
            mtext=widget->highlightText(mtext);*/

        item.replace("**col**",store.coll[x]);
        item.replace("**num**",store.num[x]);
        item.replace("**loc**",store.loc[x]);
        item.replace("**txt**",mtext);
        item.replace("(*id*)",store.id[x]);
        item.replace("(*sc*)",store.sc[x]);
        item.replace("(*fmt*)",store.fmt[x]);
        item.replace("(*name*)",store.name[x]);
        item.replace("(*chapter*)",store.chapter[x]);
        item.replace("(*verse*)",store.verse[x]);

        atxt.append(item);
    }
    ui->widget->browser()->insertHtml(atxt);
    ui->widget->finalizeContent();
    ui->widget->browser()->moveCursor(QTextCursor::Start);
}

/*void CLibSearchResult::on_widget_highlightActivated(bool * processed)
{
    displayStore();
    *processed=true;
}

void CLibSearchResult::on_widget_highlightDeactivated(bool * processed)
{
    displayStore();
    *processed=true;
}*/

void CLibSearchResult::on_widget_contentChanged(bool, bool, bool * processed)
{
    displayStore();
    *processed=true;
}

//

CLSStore::CLSStore()
    :coll(),loc(),text(),num(),id(),sc(),fmt(),name(),chapter(),verse(),init_line(),count(0)
{

}

void CLSStore::appendItem(QString const & coll,
                    QString const & loc,
                    QString const & text,
                    QString const & num,
                    QString const & id,
                    QString const & sc,
                    QString const & fmt,
                    QString const & name,
                    QString const & chapter,
                    QString const & verse)
{
    CLSStore::coll.append(coll);
    CLSStore::loc.append(loc);
    CLSStore::text.append(text);
    CLSStore::num.append(num);
    CLSStore::id.append(id);
    CLSStore::sc.append(sc);
    CLSStore::fmt.append(fmt);
    CLSStore::name.append(name);
    CLSStore::chapter.append(chapter);
    CLSStore::verse.append(verse);
    count++;
}
