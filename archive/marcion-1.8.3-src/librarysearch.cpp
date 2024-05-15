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

#include "librarysearch.h"
#include "ui_librarysearch.h"

CLibrarySearch::CLibrarySearch(CMessages * const messages,
                               CLibraryWidget * const libw,
                               MLibSearchTitle & title,
                               MSRWidget ** sr_tab,
                               QWidget *parent) :
    QWidget(parent),
    CLibSearchBase(),
    ui(new Ui::CLibrarySearch),
    messages(messages),libw(libw),title(title),
    _srtab(sr_tab),
    is_initialized(false),c_d(),
    pmenu(),disable_itch(false)
{
    ui->setupUi(this);

    connect(&title,SIGNAL(request(int)),this,SLOT(slot_requestTitle(int)));

    /*QFont cf(messages->settings().copticFont());
    cf.setPointSize(messages->settings().copticFontSize());

    QFont gf(messages->settings().greekFont());
    gf.setPointSize(messages->settings().greekFontSize());*/

    QFont lf(messages->settings().latinFont());
    lf.setPointSize(messages->settings().latinFontSize());

    //settings_fontChanged(CTranslit::Copt, cf);
    //settings_fontChanged(CTranslit::Greek, gf);
    settings_fontChanged(CTranslit::Latin, lf);

    connect(&messages->settings(),SIGNAL(fontChanged(CTranslit::Script, QFont)),this,SLOT(settings_fontChanged(CTranslit::Script, QFont)));

    //c_d.setWindowTitle("Extended Search");
    //c_d.setWindowIcon(QIcon(":/new/icons/icons/loupe.png"));

    ui->treeColl->hideColumn(1);
    ui->treeColl->hideColumn(2);
    ui->treeColl->hideColumn(3);

    ui->treeHtmlLib->hideColumn(1);
    ui->treeHtmlLib->hideColumn(2);

    ui->treeColl->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->treeHtmlLib->header()->setResizeMode(QHeaderView::ResizeToContents);

    ui->treeArchive->hideColumn(2);
    ui->treeArchive->header()->setResizeMode(QHeaderView::ResizeToContents);

    /*cmbScript->addItem("coptic",CTranslit::Copt);
    cmbScript->addItem("greek",CTranslit::Greek);
    cmbScript->addItem("latin",CTranslit::Latin);
    cmbScript->addItem("hebrew",CTranslit::Hebrew);*/

    ui->inputText->setSwitch(true);
    ui->inputText->setSwitchState(true);

    a_readbooks=pmenu.addAction(tr("&expand books"));
    a_hidebooks=pmenu.addAction(tr("&drop books"));

    TT_BUTTONS
}

CLibrarySearch::~CLibrarySearch()
{
    delete ui;
}

void CLibrarySearch::init()
{
    if(!is_initialized)
    {

        //cmbScript->setCurrentIndex(0);
        //on_cmbScript_currentIndexChanged(0);

        QString query("select `library_script`.`id`,`library_script`.`name`,`library_lang`.`id`,`library_lang`.`name` from `library_lang` inner join `library_script` on `library_script`.`id`=`library_lang`.`script` order by `library_script`.`name`,`library_lang`.`name`");

        MQUERY(q,query)

        int lastid(-1);
        QIcon b(":/new/icons/icons/alef.png"),l(":/new/icons/icons/forked.png");
        while(q.next())
        {
            int newid(q.value(0).toInt());
            if(newid!=lastid)
            {
                lastid=newid;
                ui->cmbScriptLang->appendBranch(q.value(1),b);
                ui->cmbScriptLang->appendItemToLastBranch(q.value(3),q.value(2).toInt(),lastid,l);
            }
            else
            {
                ui->cmbScriptLang->appendItemToLastBranch(q.value(3),q.value(2).toInt(),lastid,l);
            }
        }

        messages->MsgOk();
        is_initialized=true;
        on_cmbScriptLang_currentIndexChanged(ui->cmbScriptLang->currentIndex());
    }
}

//

QTreeWidget * CLibrarySearch::htmlTree(){return ui->treeHtmlLib;}

/*void CLibrarySearch::on_cmbScript_currentIndexChanged(int index)
{
    if(is_initialized)
    {
        int s(cmbScript->itemData(index).toInt());
        inputText->setScript((CTranslit::Script)s);
        //c_d.input()->setScript((CTranslit::Script)s);

        QFont f(messages->settings().font((CTranslit::Script)s));
        f.setPointSize(messages->settings().fontSize((CTranslit::Script)s));

        inputText->setFont(f);
        //c_d.input()->setFont(f);

        cmbLang->clear();

        CMySql q;
        QString query("select `id`,`name`,`def_coll` from `library_lang` where `script`="+QString::number(s));

        messages->MsgMsg("executing query "+query+" ...");
        if(!q.exec(query))
        {
            messages->MsgErr(q.lastError());
            return;
        }
        while(q.next())
            cmbLang->addItem(q.value(1),q.value(0));

        messages->MsgOk();

        on_cmbLang_currentIndexChanged(0);
    }
}*/

void CLibrarySearch::event_Query()
{
    switch(ui->tabColl->currentIndex())
    {
    case 0 :
        if(ui->tabInput->currentIndex()==0)
            ui->inputText->updateHistory();
        query();
        break;
    case 1 :
        if(ui->tabInput->currentIndex()==0)
            ui->inputText->updateHistory();
        queryArchive();
        break;
    case 2 :
        queryHtml();
        break;
    }
}

void CLibrarySearch::query()
{
    int const ci=ui->cmbScriptLang->currentIndex();

    if(ci!=-1)
    {
        USE_CLEAN_WAIT

        /*if(ui->cbNonW->isChecked())
            on_btRmNW_clicked();*/

        QString inptext;
        if(title.isPhrase()&&!title.acceptSpc())
            inptext=ui->inputText->updateL_na(false,CTranslit::RemoveAll);
        else
            inptext=ui->inputText->updateL_na(false,CTranslit::TrimAndKeepOne);

        /*if(inptext.isEmpty())
        {
            m_msg()->MsgErr(tr("input text is empty or invalid!"));
            return;
        }*/

        CTranslit::Script sc((CTranslit::Script)ui->cmbScriptLang->itemData(ui->cmbScriptLang->currentIndex()).toInt());

        CLibSearchResult *sr=new CLibSearchResult(inptext,messages,sc,CLibSearchResult::MySql);

        QString inf;

            CMySql q;
            QString query,search,bmsg,cmsg;

            char ic=0;

            query="select `col_name`,`book_name`,`book_id`,`chapter_num`,`verse_num`,`text`,`script`,`format`,`book_ord` from `library_search` where "+where_collection(&ic,cmsg,bmsg)+" and ";


            if(ic==0)
            {
                m_msg()->MsgInf(tr("no targets checked"));
                return;
            }

            QString targets(tr("targets:<br>entire collections - ")+cmsg+tr("<br>individual books - ")+bmsg);
            bool const tabi=ui->tabInput->currentIndex()==0;
            if(tabi)
            {
                if(inptext.isEmpty())
                {
                    m_msg()->MsgErr(tr("input text is empty!"));
                    return;
                }
                if(title.isPhrase())
                    search="match_phrase('"+inptext+"',`part1`,`part2`,"+(title.acceptSpc()?"false":"true") +")";
                else
                    search="match_word('"+inptext+"',`i_key`)";
            }
            else
            {
                search=ui->txtExtended->toPlainText();
            }

            QString qorder(" order by `col_name`,`book_ord`,`chapter_num`,`verse_num`");
            query.append(search+qorder+" limit "+
                         QString::number(
                         (title.page()-1)*title.limit())+","+
                         QString::number(title.limit()));


            messages->MsgMsg(tr("executing query '")+query+"' ...");
            if(!q.exec(query))
            {
                messages->MsgErr(q.lastError());
                return;
            }



            int a=q.size(),c=0;
            sr->getStore().init_line=QString(tr("input: <b>")+(tabi?inptext:search)+"</b><br><br>"+targets+"<br><br>"+QString::number(a)+tr(" matches"));

            while(q.next())
            {
                QString name(q.value(1)),
                    chapter(q.value(3)),
                    verse(q.value(4));

                QString coll(q.value(0)),
                txt(q.value(5)),
                num(QString::number(++c)+"/"+QString::number(a)),
                loc(name+" ("+chapter+"/"+verse+")"),
                id(q.value(2)),
                scr(QString::number(sc)),
                fmt(q.value(7));

                if(MHebrDict::isWLC(id.toInt()))
                    txt=MHebrDict::prepareWLC(txt);

                MTextLineItem item(txt,true);

                switch((MVersedBook::TextFormat)fmt.toShort())
                {
                    case MVersedBook::LatTr :
                    {
                        switch(sc)
                        {
                            case CTranslit::Latin :
                            txt=CTranslit::tr(item.text(),CTranslit::LatinTrToLatinN,false,CTranslit::RemoveNone);
                            break;
                            case CTranslit::Greek :
                            txt=CTranslit::tr(item.text(),CTranslit::GreekTrToGreekN,false,CTranslit::RemoveNone);
                            break;
                            case CTranslit::Copt :
                            txt=CTranslit::tr(item.text(),CTranslit::CopticTrToCopticN,false,CTranslit::RemoveNone);
                            break;
                            case CTranslit::Hebrew :
                            txt=CTranslit::tr(item.text(),CTranslit::HebrewTrToHebrewN,false,CTranslit::RemoveNone);
                            break;
                        }
                        break;
                    }
                    case MVersedBook::Native :
                    {
                        txt=item.text();
                        break;
                    }
                    case MVersedBook::Beta :
                    {
                        txt=CTranslit::betaToUtf(item.text(),sc);
                        break;
                    }
                }
                sr->getStore().appendItem(coll,loc,txt,num,id,scr,fmt,name,chapter,verse);

            }

            inf.append(tr("page: ")+
               QString::number(title.page())+
               tr(" - matches: ")+
               QString::number(q.size())+"/"+
               QString::number(title.limit()));

            messages->MsgOk();

        //messages->settings().mdiArea()->addSubWindow(sr)->setWindowIcon(QIcon(":/new/icons/icons/loupe.png"));
        sr->displayStore();

        if(tabi)
            sr->textBrowser().inputBox().setText(ui->inputText->text_utf8());
        else
            sr->textBrowser().inputBox().setText(c_d.makeRegExp());

        sr->textBrowser().setPanelVisibility(true);
        //sr->textBrowser().setWordsChecked(true);
        sr->textBrowser().inputBox().setSwitchState(false);
        sr->textBrowser().setRegExp();
        sr->goToTop();

        m_sett()->mainTab()->setCurrentIndex(MTIDX_SR);
        if(!tabi)
        {
            int const ti=(*_srtab)->addTab(sr,QString("(extended)"));

            (*_srtab)->setTabToolTip(ti,tr("input: ")+search+tr("\n\ncollections: ")+cmsg+tr("\nbooks: ")+bmsg);
            (*_srtab)->setCurrentIndex(ti);
        }
        else
        {
            int const ti=(*_srtab)->addTab(sr,inptext);

            (*_srtab)->setTabToolTip(ti,tr("input: ")+inptext+tr("\n\ncollections: ")+cmsg+tr("\nbooks: ")+bmsg);
            (*_srtab)->setCurrentIndex(ti);
        }
    }
}

void CLibrarySearch::on_btEdit_clicked()
{
    if(ui->tabColl->currentIndex()!=0)
        return;

    int i(ui->cmbScriptLang->currentIndex());
    if(i!=-1)
    {
        CTranslit::Script s((CTranslit::Script)ui->cmbScriptLang->itemData(i).toInt());
        c_d.init(s,title.isWord()?CSearchCriteria2::Word:CSearchCriteria2::Phrase);
        //c_d.input()->setFont(inputText->font());


        if(c_d.exec()==QDialog::Accepted)
        {
            c_d.makeList();
            ui->txtExtended->setText(c_d.makeWhere());
        }
    }
}

void CLibrarySearch::on_cmbScriptLang_currentIndexChanged(int index)
{
    if(index!=-1&&is_initialized)
    {
        coll.clear();
        ui->treeColl->clear();

        int s(ui->cmbScriptLang->itemData(index).toInt());
        if(ui->tabColl->currentIndex()==0)
            ui->inputText->setScript((CTranslit::Script)s);


        CMySql q;
        QString query("select `name`,`id` as `lid`,`spec_index`,`format` from `library_collection` where `lang`="+QString::number(ui->cmbScriptLang->currentOrigId()));

        messages->MsgMsg(tr("executing query '")+query+"' ...");
        if(!q.exec(query))
        {
            messages->MsgErr(q.lastError());
            return;
        }

        while(q.next())
        {
            QString spi(q.value(2)),
                id(q.value(1));
            coll.append(QTreeWidgetItem(0));
            QTreeWidgetItem * i(&coll.last());

            i->setText(0,
                  q.value(0));
            i->setText(1,
                  q.value(3));
            i->setText(2,
                  id);
            i->setText(3,
                  spi);

            i->setFlags(Qt::ItemIsUserCheckable|Qt::ItemIsEnabled);
            i->setCheckState(0,Qt::Unchecked);
            if(!libw->isSearchable(id.toInt()))
            {
                i->setIcon(0,QIcon(":/new/icons/icons/exclam.png"));
                i->setDisabled(true);
                QFont f(i->font(0));
                f.setStrikeOut(true);
                i->setFont(0,f);
            }
            ui->treeColl->addTopLevelItem(i);
        }

        messages->MsgOk();
        //cmbLang->adjustSize();
    }
}

QString CLibrarySearch::where_collection(char * icount,QString & cmsg,QString & bmsg) const
{
        QString r,b;
        for(int x=0;x<coll.count();x++)
        {
            QTreeWidgetItem const * i(&coll.at(x));
            if(i->childCount()>0&&i->checkState(0)==Qt::PartiallyChecked)
            {
                for(int y=0;y<i->childCount();y++)
                {
                    QTreeWidgetItem * ic(i->child(y));
                    if(ic->checkState(0)==Qt::Checked)
                    {
                        b.append(ic->text(1)+",");
                        (*icount)++;
                        bmsg.append(ic->text(0)+",");
                    }
                }
            }
            else if(i->checkState(0)==Qt::Checked)
            {
                r.append(i->text(2)+",");
                (*icount)++;
                cmsg.append(i->text(0)+",");
            }
        }
        if(!r.isEmpty())
        {
            r.chop(1);
            r.prepend("`col_id` in(");
            r.append(")");
        }
        if(!b.isEmpty())
        {
            b.chop(1);
            b.prepend("`book_id` in(");
            b.append(")");
        }
        if(!r.isEmpty()&&!b.isEmpty())
            r=QString("("+r+" or "+b+")");
        else
            r=QString(r+b);

        bmsg.chop(1);
        cmsg.chop(1);
        return r;
}

void CLibrarySearch::on_inputText_query()
{
    event_Query();
}

/*void CLibrarySearch::on_btRmNW_clicked()
{
    ui->inputText->setText(CTranslit::NAtoLatin2(ui->inputText->text(),true));
}*/

void CLibrarySearch::indexChangedSlot(CLibSearchBase::IndexType index_type)
{
    switch(index_type)
    {
    case MySql :
        messages->MsgMsg(tr("library search: mysql index changed"));
        on_cmbScriptLang_currentIndexChanged(ui->cmbScriptLang->currentIndex());
        break;
    case Html :
        messages->MsgMsg(tr("library search: html index changed"));
        CLibraryWidget::loadHtmlLibrary(messages,htmlTree(),true);
        break;
    case Archive :
        messages->MsgMsg(tr("library search: archive index changed"));
        //CLibraryWidget::loadArchiveLibrary(0,ui->treeArchive,false,QString(),false);
        loadArchiveTree();
        break;
    }
}

void CLibrarySearch::event_Refresh()
{
    switch(ui->tabColl->currentIndex())
    {
    case 0 :
        on_cmbScriptLang_currentIndexChanged(ui->cmbScriptLang->currentIndex());
        break;
    case 1 :
        //CLibraryWidget::loadArchiveLibrary(0,ui->treeArchive,false,QString(),false);
        loadArchiveTree();
        break;
    case 2 :
        CLibraryWidget::loadHtmlLibrary(messages,htmlTree(),true);
        break;
    }
}

void CLibrarySearch::settings_fontChanged(CTranslit::Script uf, QFont f)
{
    ui->inputText->refreshFonts();
    //c_d.input()->refreshFonts();

    QString s;
    switch(uf)
    {
        case CTranslit::Copt :
        {
            s=tr("Coptic");
            break;
        }
        case CTranslit::Latin :
        {
            ui->txtExtended->setFont(f);
            ui->txtSwInput->setFont(f);

            s=tr("Latin");
            break;
        }
        case CTranslit::Greek :
        {
            s=tr("Greek");
            break;
        }
        case CTranslit::Hebrew :
        {
            s=tr("Hebrew");
            break;
        }
    }
    messages->MsgMsg(windowTitle()+": "+s+tr(" font changed"));
}

void CLibrarySearch::event_stateChanged()
{
    if(title.isWord())
        ui->txtExtended->setText(c_d.makeWhere(CSearchCriteria2::Word));
    else
        ui->txtExtended->setText(c_d.makeWhere(CSearchCriteria2::Phrase));
}

void CLibrarySearch::collectCheckedHtmlLibItems(QList<QTreeWidgetItem*> & list,QTreeWidgetItem* item)
{
    if(item->checkState(0)==Qt::Checked)
        list.append(item);
    for(int x=0;x<item->childCount();x++)
    {
        QTreeWidgetItem * i(item->child(x));

        if(i->childCount()>0)
            collectCheckedHtmlLibItems(list,i);
        else if(i->checkState(0)==Qt::Checked)
            list.append(i);
    }
}

void CLibrarySearch::queryHtml()
{
    QList<QTreeWidgetItem*> chli;
    for(int q=0;q<ui->treeHtmlLib->topLevelItemCount();q++)
        collectCheckedHtmlLibItems(chli,ui->treeHtmlLib->topLevelItem(q));
    messages->MsgMsg(tr("html library: checked directories count: ")+QString::number(chli.count()));

    if(chli.count()>0)
    {
        USE_CLEAN_WAIT

        QString const shtext(ui->txtSwInput->text());

        CLibSearchResult * sr=new CLibSearchResult(shtext,messages,CTranslit::Latin,CLibSearchResult::Html);

        //messages->settings().mdiArea()->addSubWindow(sr)->setWindowIcon(QIcon(":/new/icons/icons/loupe.png"));

        //sr->textBrowser().inputBox().setText(shtext);
        sr->textBrowser().setPanelVisibility(true);

        for(int y=0;y<chli.count();y++)
        {
            QString swcmd(messages->settings().swishCmd()+" -f \""+chli[y]->text(3)+"/index.swish-e\" -m "+QString::number(title.limit())+" -w "+shtext+" -x \"<swishreccount> <swishrank> <swishtitle> \\<a href=<swishdocpath>$=href\\>"+(ui->cbHyperlinks->isChecked()?"<swishdocpath>":"open")+"\\</a\\>\\<br\\>\"");
            messages->MsgMsg(tr("searching in html library, command: ")+swcmd);

            //sr->append("<p style=\"color: green;\">"+swcmd+"</p><br>");

            QProcess p;
            p.start(swcmd);
            p.waitForFinished(-1);
            if(p.exitCode()==0)
            {
                QString os(QString::fromUtf8(p.readAll().replace("\n","<br>")));
                os.replace("a href=","a href=\"");
                os.replace("$=href>","\">");
                /*QRegExp r("\\(\\*urlstart\\*\\).*\\(\\*urlend\\*\\)");
                r.setMinimal(true);
                int p;
                while((p=r.indexIn(os))!=-1)
                {
                    QString nurl(r.cap(0));
                    nurl.remove(QRegExp("^\\(\\*urlstart\\*\\)"));
                    nurl.remove(QRegExp("\\(\\*urlend\\*\\)$"));
                    nurl=QUrl::toPercentEncoding(nurl);
                    //messages->MsgMsg(nurl);
                    os.replace(p,r.matchedLength(),nurl);
                }
                messages->MsgMsg(os);*/
                //messages->MsgMsg(os);
                sr->append(os);

                messages->MsgOk();
            }
            else
            {
                QString errout(QString::fromUtf8(p.readAll()));
                sr->append("<p style=\"color: red;\">"+errout.replace("\n","<br>")+"</p>");

                //sr->append("command: "+swcmd+" - exit code: "+QString::number(p.exitCode()));

                messages->MsgErr(tr("command: ")+swcmd+" - exit code: "+QString::number(p.exitCode())+"\n"+errout);
            }

        }

        sr->textBrowser().setRegExp();
        sr->goToTop();

        m_sett()->mainTab()->setCurrentIndex(MTIDX_SR);
        int const ti=(*_srtab)->addTab(sr,shtext);
        (*_srtab)->setTabToolTip(ti,tr("input: ")+shtext);
        (*_srtab)->setCurrentIndex(ti);
        //sr->show();
    }
    else
        messages->MsgWarn(tr("no directory checked"));
}

void CLibrarySearch::on_tabColl_currentChanged(int index)
{
    title.setLibIndex(index);
    switch(index)
    {
    case 0 :
    {
        int s(ui->cmbScriptLang->itemData(ui->cmbScriptLang->currentIndex()).toInt());
        c_d.input()->setScript((CTranslit::Script)s);
        ui->inputText->setScript((CTranslit::Script)s);

        ui->stwInput->setCurrentIndex(0);
        ui->inputText->allowChangeScript(false);
        ui->tabInput->widget(1)->setEnabled(true);
        c_d.input()->allowChangeScript(false);
        break;
    }
    case 1 :
        ui->stwInput->setCurrentIndex(0);
        ui->inputText->allowChangeScript(true);
        ui->tabInput->widget(1)->setEnabled(false);
        c_d.input()->allowChangeScript(true);
        break;
    case 2 :
        ui->stwInput->setCurrentIndex(1);
        ui->tabInput->widget(1)->setEnabled(false);
        break;
    }
}

/*QString CLibrarySearch::makeLinks(QString const & output) const
{
    QString rs(output),ns;
    QRegExp r("\\ \\/.+\\ ");
    r.setMinimal(true);

    QStringList l(output.split("\n",QString::SkipEmptyParts));

    for(int x=0;x<l.count();x++)
    {
        QString s(l[x]);
        if(r.indexIn(s)!=-1)
        {
            QString c(r.cap(0));
            c.remove(QRegExp("^ ")).remove(QRegExp(" $"));
            s.replace(c,"<a href=\""+c+"\">"+c+"</a>");
        }

        ns.append("<br>"+s);
    }
    return ns;
}*/


void CLibrarySearch::on_treeColl_customContextMenuRequested(QPoint )
{
    QTreeWidgetItem * i=ui->treeColl->currentItem();
    a_readbooks->setEnabled(false);
    a_hidebooks->setEnabled(false);

    if(i)
    {
        a_readbooks->setEnabled(i->childCount()==0&&!i->parent());
        a_hidebooks->setEnabled(!a_readbooks->isEnabled());
    }

    QAction * a=pmenu.exec();
    if(i&&a)
    {
        if(a==a_readbooks)
            readBooks(i);
        else if(a==a_hidebooks)
            removeBooks(i->parent()?i->parent():i);
    }
}

void CLibrarySearch::readBooks(QTreeWidgetItem * item)
{
    if(item)
    {
        disable_itch=true;

        QString query("select `name`,`id` from `library_book` where `collection`="+item->text(2)+" order by `ord`");
        MQUERY(q,query)

        while(q.next())
        {
            QTreeWidgetItem *i=new QTreeWidgetItem(0);
            i->setText(0,q.value(0));
            i->setText(1,q.value(1));
            i->setFlags(Qt::ItemIsUserCheckable|Qt::ItemIsEnabled);
            i->setCheckState(0,Qt::Unchecked);
            item->addChild(i);
        }

        item->setExpanded(true);
        item->setCheckState(0,Qt::Unchecked);
        disable_itch=false;
    }
}

void CLibrarySearch::removeBooks(QTreeWidgetItem * item)
{
    item->takeChildren();

    disable_itch=true;
    item->setCheckState(0,Qt::Unchecked);
    disable_itch=false;
}

void CLibrarySearch::on_treeColl_itemChanged(QTreeWidgetItem* item, int column)
{
    if(disable_itch)
        return;

    //messages->MsgMsg("item changed");
    if(item&&column==0)
    {
        if(!item->parent())
            checkAllBooks(item);
        else
        {
            disable_itch=true;
            item->parent()->setCheckState(0,Qt::PartiallyChecked);
            disable_itch=false;
        }
    }
}

void CLibrarySearch::checkAllBooks(QTreeWidgetItem * item)
{
    disable_itch=true;
    for(int x=0;x<item->childCount();x++)
        item->child(x)->setCheckState(0,item->checkState(0));
    disable_itch=false;
}

void CLibrarySearch::checkAllArch(QTreeWidgetItem * item)
{
    //disable_itch=true;
    for(int x=0;x<item->childCount();x++)
    {
        MItemBase * ib((MItemBase *)item->child(x));
        if(ib->isCategory())
        {
            ib->setCheckState(0,item->checkState(0));
            checkAllArch(ib);
        }
        else
        {
            MArchiveLibItem * i((MArchiveLibItem *)ib);
            if(i->_index_count>0)
                i->setCheckState(0,item->checkState(0));
        }
    }
    //disable_itch=false;
}

void CLibrarySearch::on_btAction_clicked(bool checked)
{
    if(checked)
    {
        pmenu.setButton(ui->btAction);
        on_treeColl_customContextMenuRequested(QPoint());
    }
}

void CLibrarySearch::searchCoptic(QString const & text)
{
    ui->inputText->setSwitchState(true);
    ui->inputText->setText(text);
    if(parentWidget())
    {
        parentWidget()->show();
        activateWindow();
    }
}


void CLibrarySearch::on_btSwAnd_clicked()
{
    ui->txtSwInput->insert(" and ");
}

void CLibrarySearch::on_btSwOr_clicked()
{
    ui->txtSwInput->insert(" or ");
}

void CLibrarySearch::on_btSwNot_clicked()
{
    ui->txtSwInput->insert(" not ");
}

void CLibrarySearch::on_btSwNear_clicked()
{
    ui->txtSwInput->insert(" near");
}

void CLibrarySearch::on_btSwAst_clicked()
{
    ui->txtSwInput->insert("*");
}

void CLibrarySearch::on_btSwQuest_clicked()
{
    ui->txtSwInput->insert("?");
}

void CLibrarySearch::on_btSwPhrase_clicked()
{
    ui->txtSwInput->insert("\"\"");
}

void CLibrarySearch::on_btSwPar_clicked()
{
    ui->txtSwInput->insert("()");
}

void CLibrarySearch::slot_requestTitle(int request)
{
    switch(request)
    {
    case MLibSearchTitle::Refresh :
        event_Refresh();
        break;
    case MLibSearchTitle::Query :
        event_Query();
        break;
    case MLibSearchTitle::StateChanged :
        event_stateChanged();
        break;
    }
}

void CLibrarySearch::on_txtSwInput_returnPressed()
{
    event_Query();
}

void CLibrarySearch::collectArchTargets(MItemBase * item,QString & names,QString & ids)
{
    if(!item->isCategory())
    {
        MArchiveLibItem * i((MArchiveLibItem *)item);
        if(i->checkState(0)==Qt::Checked)
        {
            names.append(i->_workT+", ");
            ids.append(QString::number(i->_id)+",");
        }
    }
    for(int x=0;x<item->childCount();x++)
        collectArchTargets((MItemBase *)item->child(x),names,ids);
}

void CLibrarySearch::queryArchive()
{
    QString works(tr("targets: ")),works_id;
    QString const inptext(ui->inputText->updateL_na(true,CTranslit::RemoveAll));

    if(inptext.isEmpty())
    {
        m_msg()->MsgErr(tr("input text is empty or invalid!"));
        return;
    }

    for(int x=0;x<ui->treeArchive->topLevelItemCount();x++)
        collectArchTargets((MItemBase*)ui->treeArchive->topLevelItem(x),works,works_id);

    if(!works_id.isEmpty())
    {
        CLibSearchResult *sr=new CLibSearchResult(inptext,messages,CTranslit::Latin,CLibSearchResult::Archive);

        //m_sett()->mdiArea()->addSubWindow(sr)->setWindowIcon(QIcon(":/new/icons/icons/loupe.png"));
        sr->textBrowser().setPanelVisibility(true);

        works.chop(2); works_id.chop(1);

        QString where;
        if(ui->tabInput->currentIndex()==0)
            where=QString("`library_mindex`.`word` regexp '"+inptext+"'");
        else
            where=ui->txtExtended->toPlainText();

        QString query("select `library_archive`.`work`,`library_author`.`author`,`library_archive`.`filename`,sum(`library_mindex`.`count`) from `library_archive` left join `library_author` on `library_archive`.`author`=`library_author`.`id` inner join `library_mindex` on `library_archive`.`id`=`library_mindex`.`archive_id` where `archive_id` in("+works_id+") and `library_mindex`.`lang`="+QString::number(ui->inputText->script_int())+" and "+where+" group by `library_archive`.`id` order by `library_archive`.`work`");
        MQUERY(q,query)

        sr->append(tr("input: <b>")+inptext+"</b><br><br>");
        sr->append(works+"<br><br>");
        if(q.size()==0)
        {
            sr->append(tr("no results"));
            //return;
        }
        else
        {
            bool outp(false);
            while(q.next())
            {
                QString auth("???"),fname("(target)");
                if(!q.isNULL(1))
                    auth=q.value(1);
                if(!q.isNULL(2))
                    fname=q.value(2);

                unsigned int c(0);
                if(!q.isNULL(3))
                    c=q.value(3).toUInt();

                if(c>0)
                {
                    outp=true;
                    sr->append(q.value(0)+", "+auth+tr(" | count: ")+q.value(3)+" | <a href=\""+fname+tr("\">open</a> [")+fname+"]<br>");
                }
            }

            if(!outp)
                sr->append(tr("no match"));
        }

        m_msg()->MsgOk();

        sr->textBrowser().setRegExp();
        sr->goToTop();

        m_sett()->mainTab()->setCurrentIndex(MTIDX_SR);
        int const ti=(*_srtab)->addTab(sr,inptext);
        (*_srtab)->setTabToolTip(ti,tr("input: ")+inptext+"\n\n"+works);
        (*_srtab)->setCurrentIndex(ti);

        //sr->show();
    }
    else
        m_msg()->MsgInf(tr("no work checked"));
}

void CLibrarySearch::loadArchiveTree()
{
    ui->treeArchive->clear();

    QString /*query1("select `id`,`name`,`branch` from `library_branch` order by `ord`"),*/
            query2("select `library_archive`.`id`,`library_archive`.`category`,`library_archive`.`work`,`library_author`.`author`,`library_archive`.`filename`,`library_archive`.`i_count`,`library_archive`.`i_count_diff`,`library_archive`.`i_lat_count`,`library_archive`.`i_gk_count`,`library_archive`.`i_cop_count`,`library_archive`.`i_heb_count` from `library_archive` left outer join `library_author` on `library_archive`.`author`=`library_author`.`id`");

    MLibraryBranches::readBranches(ui->treeArchive,true);
    //MQUERY(q1,query1)
    MQUERY(q2,query2)

    while(q2.next())
    {
        MArchiveLibItem * arch_item=new MArchiveLibItem();

        arch_item->_id=q2.value(0).toUInt();
        if(q2.isNULL(1))
        {
            arch_item->_category=0;
            arch_item->_category_is_null=true;
        }
        else
        {
            arch_item->_category=q2.value(1).toUInt();
            arch_item->_category_is_null=false;
        }
        arch_item->_workT=q2.value(2);
        if(!q2.isNULL(3))
        {
            arch_item->_authorT=q2.value(3);
            arch_item->_author_is_null=false;
        }
        else
            arch_item->_author_is_null=true;
        arch_item->_target=q2.value(4);

        if(q2.isNULL(5)||q2.isNULL(6))
        {
            arch_item->_index_count=0;
            arch_item->_index_count_diff=0;
        }
        else
        {
            arch_item->_index_count=q2.value(5).toLong();
            arch_item->_index_count_diff=q2.value(6).toLong();
            arch_item->_ind_lat=q2.value(7).toLong();
            arch_item->_ind_gk=q2.value(8).toLong();
            arch_item->_ind_cop=q2.value(9).toLong();
            arch_item->_ind_heb=q2.value(10).toLong();
        }

        arch_item->setText();
        if(arch_item->_index_count>0)
        {
            arch_item->setFlags(arch_item->flags()|Qt::ItemIsUserCheckable);
            arch_item->setCheckState(0,Qt::Unchecked);
        }
        else
        {
            QFont f(arch_item->font(0));
            f.setStrikeOut(true);
            arch_item->setFont(0,f);
            arch_item->setFlags(0);
        }

        //disable_itch=true;
        if(arch_item->_category_is_null)
        {
            arch_item->setIcon(0,QIcon(":/new/icons/icons/greencat.png"));
            ui->treeArchive->addTopLevelItem(arch_item);
        }
        else
        {
            MLibBranchItem * cat=MLibraryBranches::findId(ui->treeArchive,arch_item->_category);
            if(cat)
            {
                arch_item->setIcon(0,QIcon(":/new/icons/icons/bluecat.png"));
                cat->addChild(arch_item);
            }
            else
            {
                arch_item->setIcon(0,QIcon(":/new/icons/icons/redcat.png"));
                ui->treeArchive->addTopLevelItem(arch_item);
            }
        }
        //disable_itch=false;
    }
}

void CLibrarySearch::on_treeArchive_itemChanged(QTreeWidgetItem* item, int column)
{
    if(disable_itch)
        return;

    if(item&&column==0)
    {
        MItemBase * ibase((MItemBase *)item);
        if(ibase->isCategory())
        {
            disable_itch=true;
            checkAllArch(item);
            disable_itch=false;
        }
        else
        {
            if(ibase->parent())
            {
                disable_itch=true;
                ibase->parent()->setCheckState(0,Qt::PartiallyChecked);
                disable_itch=false;
            }
        }
    }
}
